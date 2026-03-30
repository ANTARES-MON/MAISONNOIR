<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes — MAISON NOIR · Odoo Bridge
|--------------------------------------------------------------------------
*/

// ── Public ────────────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ── Protected (JWT) ───────────────────────────────────────────────────────────
Route::middleware('auth:api')->group(function () {

    // Auth
    Route::get('/me',     [AuthController::class, 'me']);
    Route::post('/logout',[AuthController::class, 'logout']);

    // Clients
    Route::get('/clients',      [ClientController::class, 'index']);
    Route::get('/clients/{id}', [ClientController::class, 'show']);

    // Products
    Route::get('/products',          [ProductController::class, 'index']);
    Route::get('/products/variants', [ProductController::class, 'variants']);

    // Orders
    Route::get('/orders',        [OrderController::class, 'index']);
    Route::get('/orders/{id}',   [OrderController::class, 'show']);
    Route::post('/orders',       [OrderController::class, 'store']);

    // Dashboard (managers only)
    Route::get('/dashboard', [DashboardController::class, 'index']);
});
