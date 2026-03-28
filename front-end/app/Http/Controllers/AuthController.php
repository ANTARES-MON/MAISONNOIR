<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\OdooService;
use Exception;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    private $odoo;

    public function __construct(OdooService $odoo)
    {
        $this->odoo = $odoo;
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);

            // Authenticate directly against Odoo
            $user = $this->odoo->authenticate($request->email, $request->password);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Wrong credentials'
                ], 401);
            }

            // Create a custom JWT token for the session
            // We use standard JWT Auth. Assuming we have a standard User model
            // but for simplicity, we issue a token with Odoo User's payload
            $token = JWTAuth::factory()->customClaims([
                'uid' => $user['id'],
                'name' => $user['name'],
                'odoo_login' => $user['login']
            ])->make();

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'token' => $token
                ],
                'message' => 'Login successful'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
