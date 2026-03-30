<?php
namespace App\Http\Controllers;
use App\Services\OdooService;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;

class AuthController extends Controller
{
    public function __construct(private OdooService $odoo) {}

    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required|string']);

        try {
            $odooUser = $this->odoo->authenticate($request->email, $request->password);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        $isManager = $this->odoo->isManager($odooUser['uid'], $request->email);

        // Find or create local user record (needed for JWT)
        $user = User::firstOrCreate(
            ['email' => $request->email],
            ['name' => $odooUser['name'], 'password' => bcrypt($request->password),
             'odoo_uid' => $odooUser['uid'], 'role' => $isManager ? 'manager' : 'commercial']
        );

        // Always sync latest info
        $user->update([
            'name'     => $odooUser['name'],
            'odoo_uid' => $odooUser['uid'],
            'role'     => $isManager ? 'manager' : 'commercial',
        ]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'token'      => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
            'user' => [
                'uid'       => $odooUser['uid'],
                'name'      => $odooUser['name'],
                'email'     => $request->email,
                'is_manager'=> $isManager,
                'role'      => $isManager ? 'manager' : 'commercial',
            ],
        ]);
    }

    public function me()
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json(['message' => 'Non autorisé'], 401);
        }
        return response()->json($user);
    }

    public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (\Exception $e) {
            // Ignore error if token is already invalid
        }
        return response()->json(['message' => 'Déconnecté avec succès.']);
    }
}
