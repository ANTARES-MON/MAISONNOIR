import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class OrdersScreen extends StatefulWidget {
  final bool isManager;
  const OrdersScreen({super.key, required this.isManager});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<dynamic> _all = [];
  String _q = '';
  String _statusFilter = '';
  bool _loading = true;
  String _error = '';
  final _search = TextEditingController();
  final _fmt = NumberFormat('#,###', 'fr');

  static const _labels = {
    'draft':  ('Brouillon', kGray),
    'sent':   ('Envoyée',   kGreen),
    'sale':   ('Confirmée', kGreen),
    'done':   ('Terminée',  kGreen),
    'cancel': ('Annulée',   kRed),
  };

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      _all = await ApiService.getOrders();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Impossible de charger les commandes.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _all.where((o) {
        final q = _q.toLowerCase();
        final matchQ = q.isEmpty ||
            (o['name'] as String? ?? '').toLowerCase().contains(q) ||
            ((o['partner_id'] is List ? o['partner_id'][1] : '') as String)
                .toLowerCase()
                .contains(q);
        final matchS = _statusFilter.isEmpty || o['state'] == _statusFilter;
        return matchQ && matchS;
      }).toList();

  int _countState(String s) => _all.where((o) => o['state'] == s).length;

  String _fmtMad(dynamic v) =>
      '${_fmt.format((v as num?)?.toDouble() ?? 0)} MAD';

  String _fmtDate(String? d) {
    if (d == null) return '—';
    try { return DateFormat('dd/MM/yy', 'fr').format(DateTime.parse(d)); }
    catch (_) { return d; }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const AppSpinner();
    return Column(
      children: [
        Container(
          color: kBg2,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _search,
                style: const TextStyle(color: kIvory, fontSize: 14),
                onChanged: (v) => setState(() => _q = v),
                decoration: InputDecoration(
                  hintText: 'Réf ou client…',
                  hintStyle: const TextStyle(color: kGray2, fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: kGray, size: 20),
                  filled: true,
                  fillColor: kBg3,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              // status filter chips
              SizedBox(
                height: 30,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _chip('Tous', ''),
                    ..._labels.entries.map((e) =>
                        _chip('${e.value.$1} (${_countState(e.key)})', e.key,
                            color: e.value.$2)),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${widget.isManager ? "TOUTES LES VENTES" : "MES VENTES"} · ${_filtered.length}',
                style: const TextStyle(
                    fontSize: 9, color: kBrandText, letterSpacing: 2.5),
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

        Expanded(
          child: RefreshIndicator(
            color: kBrandText,
            backgroundColor: kBg2,
            onRefresh: _load,
            child: _filtered.isEmpty
                ? const Center(
                    child: Text('Aucune commande',
                        style: TextStyle(color: kGray)))
                : ListView.separated(
                    itemCount: _filtered.length,
                    separatorBuilder: (_, __) => const BrandDivider(),
                    itemBuilder: (_, i) {
                      final o = _filtered[i] as Map<String, dynamic>;
                      final partnerName = o['partner_id'] is List
                          ? o['partner_id'][1] as String
                          : '—';
                      return ListTile(
                        tileColor: kBlack,
                        title: Row(
                          children: [
                            Text(o['name'] as String? ?? '—',
                                style: const TextStyle(
                                    color: kBrandText,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13)),
                            const Spacer(),
                            Text(_fmtMad(o['amount_total']),
                                style: const TextStyle(
                                    color: kIvory,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13)),
                          ],
                        ),
                        subtitle: Row(
                          children: [
                            Expanded(
                              child: Text(partnerName,
                                  style: const TextStyle(
                                      color: kGray, fontSize: 12)),
                            ),
                            const SizedBox(width: 8),
                            StatusBadge(o['state'] as String? ?? 'draft'),
                          ],
                        ),
                        trailing: Text(
                          _fmtDate(o['date_order'] as String?),
                          style: const TextStyle(color: kGray2, fontSize: 11),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _chip(String label, String val, {Color color = kGray}) => Padding(
        padding: const EdgeInsets.only(right: 6),
        child: GestureDetector(
          onTap: () => setState(
              () => _statusFilter = _statusFilter == val && val != '' ? '' : val),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: _statusFilter == val ? kBrand : kBg3,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: _statusFilter == val ? kBrandMid : kBorder),
            ),
            child: Text(label,
                style: TextStyle(
                    fontSize: 10,
                    color: _statusFilter == val ? Colors.white : color,
                    fontWeight: FontWeight.w600)),
          ),
        ),
      );
}
