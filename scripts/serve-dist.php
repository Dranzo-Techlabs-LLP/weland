<?php
// Local preview of the production build, routed the way the .htaccess files
// route it on the server. Uses PHP's built-in server:
//
//   npm run build:all
//   npm run preview:all          → http://localhost:8080
//
//   /api/*     → server/api/index.php (reads your local server/api/config.php)
//   /admin/*   → dist/admin files, otherwise the admin SPA (dist/admin/index.html)
//   /*         → dist files (the website), otherwise dist/404.html
declare(strict_types=1);

$dist = realpath(__DIR__ . '/../dist');
if ($dist === false) {
  http_response_code(500);
  exit('dist/ not found. Run `npm run build:all` first.');
}
$uri = rawurldecode((string)(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));

function send_html(string $file, int $status = 200): bool {
  http_response_code($status);
  header('Content-Type: text/html; charset=utf-8');
  readfile($file);
  return true;
}

// Resolve a URL path inside dist/ without letting "../" climb out of it.
function in_dist(string $dist, string $uri): ?string {
  $p = realpath($dist . str_replace('/', DIRECTORY_SEPARATOR, $uri));
  return ($p !== false && str_starts_with($p, $dist)) ? $p : null;
}

// PHP log and ini files are never served (FilesMatch in deploy/.htaccess)
if (in_array(basename($uri), ['error_log', '.user.ini', 'php.ini'], true)) {
  http_response_code(403);
  return true;
}

// www.welandresort.com -> welandresort.com for the website and the admin
// (deploy/.htaccess, admin/.htaccess). Not for SSL checks, and not for /api:
// a redirect would turn the form's POST into a GET.
$host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
if ($host === 'www.welandresort.com' && !str_starts_with($uri, '/.well-known/') && !preg_match('#^/api(/|$)#', $uri)) {
  header('Location: http://welandresort.com' . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
  return true;
}

// PHP API
if (preg_match('#^/api(/|$)#', $uri)) {
  chdir(__DIR__ . '/../server/api');
  require __DIR__ . '/../server/api/index.php';
  return true;
}

// Old admin URLs from when the admin lived at the root (same list as deploy/.htaccess)
if (preg_match('#^/(login|calendar|bookings|accounting|expenses|reports|rooms|users|roles|invoice)(/.*)?$#', $uri, $m)) {
  header('Location: /admin/' . $m[1] . ($m[2] ?? ''), true, 302);
  return true;
}

// Apache adds the trailing slash to directories (DirectorySlash)
if ($uri === '/admin') {
  header('Location: /admin/', true, 301);
  return true;
}

$path = in_dist($dist, $uri);

// Admin SPA: real files, otherwise its index.html (client-side routing)
if (str_starts_with($uri, '/admin/')) {
  if ($path !== null && is_file($path)) return false;
  return send_html($dist . '/admin/index.html');
}

// Website: real files, directory index, name.html, otherwise the 404 page
if ($path !== null && is_file($path)) return false;
if ($path !== null && is_dir($path) && is_file($path . DIRECTORY_SEPARATOR . 'index.html')) {
  return send_html($path . DIRECTORY_SEPARATOR . 'index.html');
}
$page = in_dist($dist, rtrim($uri, '/') . '.html');
if ($page !== null && is_file($page)) return send_html($page);
return send_html($dist . '/404.html', 404);
