import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../constants.dart';

class ApiService {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'mn_jwt';
  static const _userKey  = 'mn_user';

  // ── Token ─────────────────────────────────────────────────────────────────
  static Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);
  static Future<String?> getToken() => _storage.read(key: _tokenKey);
  static Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }

  static Future<void> saveUser(Map<String, dynamic> user) =>
      _storage.write(key: _userKey, value: jsonEncode(user));
  static Future<Map<String, dynamic>?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  // ── Core request ──────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> _req(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final uri = Uri.parse('$kApiBase$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth) {
      final tok = await getToken();
      if (tok != null) headers['Authorization'] = 'Bearer $tok';
    }
    final bodyBytes = body != null ? jsonEncode(body) : null;
    late http.Response res;
    try {
      if (method == 'POST') {
        res = await http
            .post(uri, headers: headers, body: bodyBytes)
            .timeout(const Duration(seconds: 15));
      } else {
        res = await http
            .get(uri, headers: headers)
            .timeout(const Duration(seconds: 15));
      }
    } catch (e) {
      throw const ApiException('Le serveur est inaccessible ou a expiré.', 0);
    }

    Map<String, dynamic> data;
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (e) {
      throw ApiException('Réponse du serveur invalide (Erreur ${res.statusCode}).', res.statusCode);
    }

    if (res.statusCode >= 400) {
      throw ApiException(
          data['message'] ?? 'Erreur ${res.statusCode}', res.statusCode);
    }
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final data = await _req('POST', '/login',
        body: {'email': email, 'password': password}, requiresAuth: false);
    await saveToken(data['token'] as String);
    await saveUser(data['user'] as Map<String, dynamic>);
    return data;
  }

  static Future<void> logout() async {
    try {
      await _req('POST', '/logout');
    } catch (_) {}
    await clearToken();
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getClients() async {
    final d = await _req('GET', '/clients');
    return d['data'] as List;
  }

  // ── Products ──────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getProducts() async {
    final d = await _req('GET', '/products');
    return d['data'] as List;
  }

  static Future<List<dynamic>> getVariants() async {
    final d = await _req('GET', '/products/variants');
    return d['data'] as List;
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getOrders() async {
    final d = await _req('GET', '/orders');
    return d['data'] as List;
  }

  static Future<Map<String, dynamic>> createOrder(
      int partnerId, List<Map<String, dynamic>> lines) async {
    return _req('POST', '/orders',
        body: {'partner_id': partnerId, 'lines': lines});
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDashboard() =>
      _req('GET', '/dashboard');
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  const ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}
