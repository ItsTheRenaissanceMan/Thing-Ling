# Source for the inline command in Play Thing Ling.cmd.
# Windows PowerShell 5.1 / Windows 10 and 11. No execution policy changes.
$ErrorActionPreference = 'Stop';
$gamePath = Join-Path $env:THING_LING_ROOT 'Thing-Ling.html';
if (-not [IO.File]::Exists($gamePath)) {
    Write-Host 'Thing-Ling.html is missing. Extract the entire ZIP before starting.' -ForegroundColor Yellow;
    exit 1;
};
$gameBytes = [IO.File]::ReadAllBytes($gamePath);
$url = 'http://127.0.0.1:43127/';
$newLine = [string]::Concat([char]13, [char]10);
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 43127);
try {
    $listener.Start();
} catch {
    Write-Host 'Port 43127 is unavailable. If Thing Ling is already running, close its launcher window and try again.' -ForegroundColor Yellow;
    exit 1;
};
try {
    Write-Host 'THING LING - Your little world is ready.' -ForegroundColor Green;
    Write-Host 'Keep this window open while playing. Close it to stop the launcher.';
    Write-Host ('Game address: ' + $url);
    Write-Host 'Progress is saved in your browser. Use the same browser profile each time.';
    try {
        Start-Process -FilePath $url;
    } catch {
        Write-Host 'Could not open your default browser. Open the game address above in Edge or Chrome.' -ForegroundColor Yellow;
    };
    while ($true) {
        $client = $listener.AcceptTcpClient();
        try {
            $client.ReceiveTimeout = 2000;
            $client.SendTimeout = 5000;
            $stream = $client.GetStream();
            $header = [Text.StringBuilder]::new();
            while ($header.Length -lt 8192) {
                $byte = $stream.ReadByte();
                if ($byte -lt 0) { break; };
                [void]$header.Append([char]$byte);
                if ($header.Length -ge 4 -and $header.ToString($header.Length - 4, 4) -eq ($newLine + $newLine)) { break; };
            };
            $request = $header.ToString();
            $firstLine = ($request -split $newLine)[0];
            $parts = $firstLine -split ' ';
            $payload = [byte[]]@();
            $status = '404 Not Found';
            $contentType = 'text/plain; charset=utf-8';
            $isHead = $parts.Length -ge 1 -and $parts[0] -eq 'HEAD';
            $validHost = $request -match '(?im)^Host: 127\.0\.0\.1:43127\r?$';
            if ($header.Length -ge 8192 -or -not $request.EndsWith($newLine + $newLine)) {
                $status = '400 Bad Request';
            } elseif (-not $validHost) {
                $status = '403 Forbidden';
            } elseif ($parts.Length -ne 3 -or $parts[0] -notin @('GET', 'HEAD')) {
                $status = '405 Method Not Allowed';
            } elseif ($parts[1] -in @('/', '/index.html', '/Thing-Ling.html')) {
                $status = '200 OK';
                $contentType = 'text/html; charset=utf-8';
                $payload = $gameBytes;
            } elseif ($parts[1] -eq '/favicon.ico') {
                $status = '204 No Content';
            };
            $response = 'HTTP/1.1 ' + $status + $newLine + 'Content-Type: ' + $contentType + $newLine + 'Content-Length: ' + $payload.Length + $newLine + 'Cache-Control: no-store' + $newLine + 'X-Content-Type-Options: nosniff' + $newLine + 'Connection: close' + $newLine + $newLine;
            $responseBytes = [Text.Encoding]::ASCII.GetBytes($response);
            $stream.Write($responseBytes, 0, $responseBytes.Length);
            if (-not $isHead -and $payload.Length -gt 0) {
                $stream.Write($payload, 0, $payload.Length);
            };
            $stream.Flush();
        } catch {
            # Browser preconnects can close or time out without sending a request.
        } finally {
            $client.Dispose();
        };
    };
} finally {
    $listener.Stop();
};
