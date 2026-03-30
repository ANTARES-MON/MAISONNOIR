<?php
namespace App\Http\Controllers;
use App\Services\OdooService;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private OdooService $odoo) {}

    public function index(Request $request)
    {
        try {
            $products = $this->odoo->searchRead(
                'product.template',
                [['sale_ok', '=', true]],
                ['name','default_code','list_price','categ_id','description_sale','active'],
                500,
                'name asc'
            );
            return response()->json(['data' => $products, 'total' => count($products)]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // product.product (variants) — used for order lines
    public function variants()
    {
        try {
            $variants = $this->odoo->searchRead(
                'product.product',
                [['sale_ok', '=', true]],
                ['name','default_code','list_price','categ_id'],
                500,
                'name asc'
            );
            return response()->json(['data' => $variants, 'total' => count($variants)]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
