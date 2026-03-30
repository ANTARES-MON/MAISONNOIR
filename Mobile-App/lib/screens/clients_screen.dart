import 'package:flutter/material.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});
  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  List<dynamic> _all = [];
  String _q = '';
  bool _loading = true;
  String _error = '';
  final _search = TextEditingController();

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      _all = await ApiService.getClients();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Impossible de charger les clients.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _q.isEmpty
      ? _all
      : _all.where((c) {
          final q = _q.toLowerCase();
          return (c['name'] as String? ?? '').toLowerCase().contains(q) ||
              (c['email'] as String? ?? '').toLowerCase().contains(q) ||
              (c['city'] as String? ?? '').toLowerCase().contains(q);
        }).toList();

  @override
  Widget build(BuildContext context) {
    if (_loading) return const AppSpinner();
    return Column(
      children: [
        // ── Search bar ──────────────────────────────────────────────────────
        Container(
          color: kBg2,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: TextField(
            controller: _search,
            style: const TextStyle(color: kIvory, fontSize: 14),
            onChanged: (v) => setState(() => _q = v),
            decoration: InputDecoration(
              hintText: 'Rechercher un client…',
              hintStyle: const TextStyle(color: kGray2, fontSize: 13),
              prefixIcon:
                  const Icon(Icons.search, color: kGray, size: 20),
              suffixIcon: _q.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: kGray, size: 18),
                      onPressed: () {
                        _search.clear();
                        setState(() => _q = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: kBg3,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        // ── Header ──────────────────────────────────────────────────────────
        Container(
          color: kBg2,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('BASE DE DONNÉES',
                        style: const TextStyle(
                            fontSize: 9, color: kBrandText, letterSpacing: 3)),
                    const SizedBox(height: 4),
                    Text('Clients Odoo (${_all.length})',
                        style: const TextStyle(
                            fontSize: 18,
                            color: kIvory,
                            fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              if (_error.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.refresh, color: kBrandText),
                  onPressed: _load,
                ),
            ],
          ),
        ),
        const BrandDivider(),

        if (_error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(16),
            child: ErrorCard(message: _error, onRetry: _load),
          ),

        // ── List ─────────────────────────────────────────────────────────────
        Expanded(
          child: RefreshIndicator(
            color: kBrandText,
            backgroundColor: kBg2,
            onRefresh: _load,
            child: ListView.separated(
              itemCount: _filtered.length,
              separatorBuilder: (_, __) => const BrandDivider(),
              itemBuilder: (_, i) {
                final c = _filtered[i] as Map<String, dynamic>;
                final initial =
                    (c['name'] as String? ?? '?')[0].toUpperCase();
                return ListTile(
                  tileColor: kBlack,
                  leading: CircleAvatar(
                    backgroundColor: kBrand.withValues(alpha: 0.2),
                    radius: 20,
                    child: Text(initial,
                        style: const TextStyle(
                            color: kBrandText,
                            fontWeight: FontWeight.w700,
                            fontSize: 14)),
                  ),
                  title: Text(c['name'] as String? ?? '—',
                      style: const TextStyle(
                          color: kIvory,
                          fontWeight: FontWeight.w600,
                          fontSize: 14)),
                  subtitle: Text(
                    [
                      if (c['email'] != false && c['email'] != null)
                        c['email'],
                      if (c['city'] != false && c['city'] != null)
                        c['city'],
                    ].join(' · '),
                    style: const TextStyle(color: kGray, fontSize: 12),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: kBrand.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                            '${c['sale_order_count'] ?? 0} cmd',
                            style: const TextStyle(
                                color: kBrandText,
                                fontSize: 10,
                                fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right, color: kGray, size: 18),
                    ],
                  ),
                  onTap: () {
                    // TODO: navigate to client orders detail
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
