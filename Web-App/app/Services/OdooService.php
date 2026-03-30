<?php

namespace App\Services;

use Exception;
use Ripcord\Ripcord;
use Illuminate\Support\Facades\Log;

class OdooService
{
    private $url;
    private $db;
    private $username;
    private $apiKey;
    private $uid;
    private $models;
    private $common;

    public function __construct()
    {
        $this->url = env('ODOO_URL');
        $this->db = env('ODOO_DB');
        $this->username = env('ODOO_USERNAME');
        $this->apiKey = env('ODOO_API_KEY') ?: env('ODOO_PASSWORD');
    }

    /**
     * Establish XML-RPC connection and authenticate
     */
    private function connect()
    {
        try {
            // Setup stream context for ngrok headers
            $context = stream_context_create([
                'http' => [
                    'header' => "ngrok-skip-browser-warning: true\r\n"
                ]
            ]);

            $this->common = Ripcord::client("{$this->url}/xmlrpc/2/common", [], $context);
            $this->uid = $this->common->authenticate($this->db, $this->username, $this->apiKey, []);
            
            if (!$this->uid) {
                throw new Exception("Wrong Odoo credentials or database name.");
            }
            
            $this->models = Ripcord::client("{$this->url}/xmlrpc/2/object", [], $context);
        } catch (Exception $e) {
            Log::error("Odoo Connection failed: " . $e->getMessage());
            throw new Exception("Odoo connection failed: " . $e->getMessage());
        }
    }

    /**
     * Execute RPC Call
     */
    public function call($model, $method, $args = [], $kwargs = [])
    {
        if (!$this->uid) {
            $this->connect();
        }
        
        try {
            return $this->models->execute_kw(
                $this->db, 
                $this->uid, 
                $this->apiKey, 
                $model, 
                $method, 
                $args, 
                $kwargs
            );
        } catch (Exception $e) {
            Log::error("Odoo RPC failed on [$model.$method]: " . $e->getMessage());
            throw new Exception("Odoo execution failed: " . $e->getMessage());
        }
    }

    /**
     * Authentication method for AuthController
     */
    public function authenticate($email, $password)
    {
        try {
            $context = stream_context_create([
                'http' => [
                    'header' => "ngrok-skip-browser-warning: true\r\n"
                ]
            ]);

            $common = Ripcord::client("{$this->url}/xmlrpc/2/common", [], $context);
            // Verify if user's real credentials match Odoo
            $uid = $common->authenticate($this->db, $email, $password, []);
            
            if (!$uid) {
                throw new Exception("Wrong credentials");
            }
            
            // Fetch extra info just to be sure
            $models = Ripcord::client("{$this->url}/xmlrpc/2/object", [], $context);
            $user = $models->execute_kw($this->db, $uid, $password, 'res.users', 'read', [[$uid]], ['fields' => ['name', 'login']]);
            
            return $user[0] ?? null;
        } catch (Exception $e) {
            if (str_contains($e->getMessage(), 'cURL') || str_contains($e->getMessage(), 'Connection refused')) {
                throw new Exception("Odoo connection failed or ngrok timeout");
            }
            throw new Exception("Wrong credentials");
        }
    }

    public function getClients()
    {
        $result = $this->call('res.partner', 'search_read', 
            [[['customer_rank', '>', 0]]], 
            ['fields' => ['name', 'email', 'phone', 'city', 'street']]
        );
        return is_array($result) ? $result : [];
    }

    public function getProducts()
    {
        $result = $this->call('product.template', 'search_read', 
            [[['sale_ok', '=', true]]], 
            ['fields' => ['name', 'list_price', 'categ_id', 'description', 'image_1920']]
        );
        return is_array($result) ? $result : [];
    }

    public function getOrders()
    {
        $result = $this->call('sale.order', 'search_read', 
            [[]], 
            ['fields' => ['name', 'partner_id', 'amount_total', 'state', 'date_order']]
        );
        return is_array($result) ? $result : [];
    }

    public function getOrderLines($orderId)
    {
        $result = $this->call('sale.order.line', 'search_read', 
            [[['order_id', '=', (int) $orderId]]], 
            ['fields' => ['product_id', 'product_uom_qty', 'price_unit', 'price_subtotal']]
        );
        return is_array($result) ? $result : [];
    }

    public function createOrder($partnerId, $lines)
    {
        $orderLines = [];
        foreach ($lines as $line) {
            $orderLines[] = [0, 0, [
                'product_id' => $line['product_id'],
                'product_uom_qty' => $line['qty'],
            ]];
        }

        return $this->call('sale.order', 'create', [[
            'partner_id' => $partnerId,
            'order_line' => $orderLines
        ]]);
    }

    public function getDashboardStats()
    {
        $totalClients = $this->call('res.partner', 'search_count', [[['customer_rank', '>', 0]]]);
        $totalProducts = $this->call('product.template', 'search_count', [[['sale_ok', '=', true]]]);
        $totalOrders = $this->call('sale.order', 'search_count', [[]]);
        
        // Compute revenue
        $orders = $this->call('sale.order', 'search_read', 
            [[['state', 'in', ['sale', 'done']]]], 
            ['fields' => ['amount_total']]
        );
        
        $totalRevenue = 0;
        if (is_array($orders)) {
            foreach ($orders as $order) {
                $totalRevenue += $order['amount_total'] ?? 0;
            }
        }

        return [
            'total_clients' => $totalClients,
            'total_products' => $totalProducts,
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue
        ];
    }
}
