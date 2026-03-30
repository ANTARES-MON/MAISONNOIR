<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;
use Exception;

class OdooService
{
    private string $url;
    private string $db;
    private int    $uid;
    private string $apiKey;
    private array  $headers;

    public function __construct()
    {
        $this->url    = rtrim(config('odoo.url'), '/');
        $this->db     = config('odoo.db');
        $this->uid    = (int) config('odoo.uid', 1);
        $this->apiKey = config('odoo.api_key');
        $this->headers = [
            'Content-Type'               => 'application/json',
            'ngrok-skip-browser-warning' => 'true',
        ];
    }

    public function authenticate(string $login, string $password): array
    {
        $uid = $this->jsonRpc('common', 'authenticate', [
            $this->db, $login, $password, [],
        ]);
        if (!$uid) throw new Exception('Identifiants incorrects.');
        return ['uid' => (int)$uid, 'name' => $login];
    }

    public function searchRead(string $model, array $domain = [], array $fields = [], int $limit = 200, string $order = ''): array
    {
        $kwargs = ['fields' => $fields, 'limit' => $limit];
        if ($order) $kwargs['order'] = $order;
        return $this->callKw($model, 'search_read', [$domain], $kwargs);
    }

    public function searchCount(string $model, array $domain = []): int
    {
        return (int)$this->callKw($model, 'search_count', [$domain], []);
    }

    public function create(string $model, array $values): int
    {
        return (int)$this->callKw($model, 'create', [$values], []);
    }

    public function isManager(int $uid, string $email = ''): bool
    {
        try {
            $groups = $this->searchRead('res.groups', [['users','in',[$uid]]], ['full_name','name'], 100);
            foreach ($groups as $g) {
                $f = strtolower($g['full_name'] ?? ''); $n = strtolower($g['name'] ?? '');
                if (str_contains($f,'manager')||str_contains($n,'manager')||str_contains($f,'administrator')||str_contains($f,'gestionnaire')) return true;
            }
        } catch (\Throwable) {}

        // Fallback: email-based detection (matching web app)
        $e = strtolower($email);
        if (str_contains($e, 'o.bennis') || str_contains($e, 'manager') || str_contains($e, 'directeur')) {
            return true;
        }

        return false;
    }

    // ── Low-level /jsonrpc helpers ─────────────────────────────────────────

    private function jsonRpc(string $service, string $method, array $args): mixed
    {
        $res = Http::withHeaders($this->headers)->timeout(30)
            ->post($this->url . '/jsonrpc', [
                'jsonrpc' => '2.0',
                'method'  => 'call',
                'id'      => time(),
                'params'  => ['service' => $service, 'method' => $method, 'args' => $args],
            ]);
        if ($res->failed()) throw new Exception('Odoo HTTP ' . $res->status());
        $data = $res->json();
        if (isset($data['error'])) throw new Exception($data['error']['data']['message'] ?? $data['error']['message'] ?? 'Odoo error');
        return $data['result'];
    }

    private function callKw(string $model, string $method, array $args, array $kwargs): mixed
    {
        $kwargs = array_merge([
            'context' => [
                'lang' => 'fr_FR',
                'mail_create_nosubscribe' => true,
                'mail_create_nolog' => true,
                'tracking_disable' => true,
            ]
        ], $kwargs);
        return $this->jsonRpc('object', 'execute_kw', [
            $this->db,
            $this->uid,   // UID from ODOO_UID env var
            $this->apiKey,
            $model,
            $method,
            $args,
            $kwargs,
        ]);
    }
}
