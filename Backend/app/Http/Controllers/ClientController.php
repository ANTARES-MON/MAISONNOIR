<?php
namespace App\Http\Controllers;
use App\Services\OdooService;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(private OdooService $odoo) {}

    public function index(Request $request)
    {
        try {
            $clients = $this->odoo->searchRead(
                'res.partner',
                [['customer_rank', '>', 0]],
                ['name','email','phone','city','sale_order_count','street','country_id'],
                500,
                'name asc'
            );
            return response()->json(['data' => $clients, 'total' => count($clients)]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function show(int $id)
    {
        try {
            $clients = $this->odoo->searchRead(
                'res.partner',
                [['id', '=', $id]],
                ['name','email','phone','city','street','sale_order_count','country_id'],
                1
            );
            if (empty($clients)) return response()->json(['message' => 'Client introuvable.'], 404);
            return response()->json(['data' => $clients[0]]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
