<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Public routes
Route::post('login', [AuthController::class, 'login']);

// Protected routes (Requires valid JWT token)
Route::middleware('auth:api')->group(function () {
    
    // Clients
    Route::get('clients', [ClientController::class, 'index']);
    
    // Products
    Route::get('products', [ProductController::class, 'index']);
    
    // Orders
    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'create']);
    
    // Dashboard Stats
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);

});
