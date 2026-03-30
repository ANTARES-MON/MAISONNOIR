<?php
namespace App\Http\Controllers;

use App\Services\OdooService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private OdooService $odoo) {}

    public function index(Request $request)
    {
        $user = auth()->user();

        // Only managers may access the dashboard
        if (!$user || $user->role !== 'manager') {
            return response()->json(['message' => 'Accès réservé aux managers.'], 403);
        }

        try {
            // Run all counts in parallel (as sequential calls — PHP is sync)
            $clientCount  = $this->odoo->searchCount('res.partner',      [['customer_rank', '>', 0]]);
            $productCount = $this->odoo->searchCount('product.template', [['sale_ok', '=', true]]);
            $orderCount   = $this->odoo->searchCount('sale.order',       []);

            // Recent orders (last 10)
            $recentOrders = $this->odoo->searchRead(
                'sale.order',
                [],
                ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id'],
                10,
                'id desc'
            );

            // Revenue: sum of confirmed/done orders (max 500)
            $confirmedOrders = $this->odoo->searchRead(
                'sale.order',
                [['state', 'in', ['sale', 'done']]],
                ['amount_total'],
                500
            );
            $revenue = array_reduce($confirmedOrders, fn($carry, $o) => $carry + ($o['amount_total'] ?? 0), 0.0);

            // Order breakdown by state
            $byState = [];
            foreach (['draft', 'sent', 'sale', 'done', 'cancel'] as $state) {
                $byState[$state] = $this->odoo->searchCount('sale.order', [['state', '=', $state]]);
            }

            return response()->json([
                'stats' => [
                    'clients'  => $clientCount,
                    'products' => $productCount,
                    'orders'   => $orderCount,
                    'revenue'  => round($revenue, 2),
                ],
                'orders_by_state' => $byState,
                'recent_orders'   => $recentOrders,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
