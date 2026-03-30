<?php
namespace App\Http\Controllers;

use App\Services\OdooService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private OdooService $odoo) {}

    /**
     * List orders.
     * Managers see all; commercials see only their own (filtered by odoo_uid).
     */
    public function index(Request $request)
    {
        try {
            $user   = auth()->user();
            $domain = [];
            if ($user && $user->role !== 'manager') {
                $domain = [['user_id', '=', (int) $user->odoo_uid]];
            }

            $orders = $this->odoo->searchRead(
                'sale.order',
                $domain,
                ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id', 'order_line'],
                200,
                'id desc'
            );

            return response()->json(['data' => $orders, 'total' => count($orders)]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Single order with line details.
     */
    public function show(int $id)
    {
        try {
            $orders = $this->odoo->searchRead(
                'sale.order',
                [['id', '=', $id]],
                ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'user_id', 'order_line'],
                1
            );
            if (empty($orders)) {
                return response()->json(['message' => 'Commande introuvable.'], 404);
            }

            $order = $orders[0];

            // Fetch order lines
            if (!empty($order['order_line'])) {
                $lines = $this->odoo->searchRead(
                    'sale.order.line',
                    [['order_id', '=', $id]],
                    ['product_id', 'product_uom_qty', 'price_unit', 'price_subtotal', 'name'],
                    200
                );
                $order['lines'] = $lines;
            } else {
                $order['lines'] = [];
            }

            return response()->json(['data' => $order]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a new sale order in Odoo.
     * Body: { partner_id, lines: [{ product_id, qty, price_unit? }] }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'partner_id'          => 'required|integer',
            'lines'               => 'required|array|min:1',
            'lines.*.product_id'  => 'required|integer',
            'lines.*.qty'         => 'required|numeric|min:0.01',
            'lines.*.price_unit'  => 'sometimes|numeric|min:0',
        ]);

        try {
            $user = auth()->user();

            $orderLines = array_map(fn($l) => [0, 0, [
                'product_id'      => (int) $l['product_id'],
                'product_uom_qty' => (float) $l['qty'],
                'price_unit'      => isset($l['price_unit']) ? (float) $l['price_unit'] : 0,
            ]], $validated['lines']);

            $orderId = $this->odoo->create('sale.order', [
                'partner_id' => (int) $validated['partner_id'],
                'user_id'    => (int) ($user->odoo_uid ?? 0) ?: false,
                'order_line' => $orderLines,
            ]);

            // Return the created order
            $orders = $this->odoo->searchRead(
                'sale.order',
                [['id', '=', $orderId]],
                ['name', 'partner_id', 'amount_total', 'state', 'date_order'],
                1
            );

            return response()->json([
                'message' => 'Commande créée avec succès.',
                'data'    => $orders[0] ?? ['id' => $orderId],
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
