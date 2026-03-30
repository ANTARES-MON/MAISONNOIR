import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});
  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<dynamic> _all = [];
  String _q = '';
  String _cat = '';
  bool _loading = true;
  String _error = '';
  final _search = TextEditingController();
  final _fmt = NumberFormat('#,###', 'fr');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      _all = await ApiService.getProducts();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Impossible de charger les produits.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> get _categories {
    final cats = _all
        .map((p) {
          final c = p['categ_id'];
          return c is List ? c[1] as String : null;
        })
        .whereType<String>()
        .toSet()
        .toList()
      ..sort();
    return cats;
  }

  List<dynamic> get _filtered => _all.where((p) {
        final q = _q.toLowerCase();
        final matchQ = q.isEmpty ||
            (p['name'] as String? ?? '').toLowerCase().contains(q) ||
            (p['default_code'] as String? ?? '').toLowerCase().contains(q);
        final catName = p['categ_id'] is List ? p['categ_id'][1] : '';
        final matchCat = _cat.isEmpty || catName == _cat;
        return matchQ && matchCat;
      }).toList();

  String _fmtMad(dynamic v) =>
      '${_fmt.format((v as num?)?.toDouble() ?? 0)} MAD';

  @override
  Widget build(BuildContext context) {
    if (_loading) return const AppSpinner();
    final cats = _categories;

    return Column(
      children: [
        // ── Filters ─────────────────────────────────────────────────────────
        Container(
          color: kBg2,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            children: [
              TextField(
                controller: _search,
                style: const TextStyle(color: kIvory, fontSize: 14),
                onChanged: (v) => setState(() => _q = v),
                decoration: InputDecoration(
                  hintText: 'Nom ou référence…',
                  hintStyle: const TextStyle(color: kGray2, fontSize: 13),
                  prefixIcon:
                      const Icon(Icons.search, color: kGray, size: 20),
                  filled: true,
                  fillColor: kBg3,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              if (cats.isNotEmpty) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 32,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _catChip('Toutes', ''),
                      ...cats.map((c) => _catChip(c, c)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'CATALOGUE · ${_filtered.length} produits',
                  style: const TextStyle(
                      fontSize: 9, color: kBrandText, letterSpacing: 2.5),
                ),
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
                final p = _filtered[i] as Map<String, dynamic>;
                final catName =
                    p['categ_id'] is List ? p['categ_id'][1] as String : '—';
                final ref = p['default_code'] as String?;
                return ListTile(
                  tileColor: kBlack,
                  title: Text(p['name'] as String? ?? '—',
                      style: const TextStyle(
                          color: kIvory,
                          fontWeight: FontWeight.w600,
                          fontSize: 14)),
                  subtitle: Row(
                    children: [
                      if (ref != null && ref.isNotEmpty) ...[
                        Text(ref,
                            style: const TextStyle(
                                color: kGray2,
                                fontSize: 11,
                                fontFamily: 'monospace')),
                        const Text(' · ',
                            style: TextStyle(color: kGray2, fontSize: 11)),
                      ],
                      Expanded(
                        child: Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: kBrand.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(catName,
                              style: const TextStyle(
                                  color: kBrandText,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                  trailing: Text(
                    _fmtMad(p['list_price']),
                    style: const TextStyle(
                        color: kBrandText,
                        fontWeight: FontWeight.w700,
                        fontSize: 14),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _catChip(String label, String val) => Padding(
        padding: const EdgeInsets.only(right: 6),
        child: GestureDetector(
          onTap: () => setState(() => _cat = val),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _cat == val ? kBrand : kBg3,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: _cat == val ? kBrandMid : kBorder),
            ),
            child: Text(label,
                style: TextStyle(
                    fontSize: 11,
                    color: _cat == val ? Colors.white : kGray,
                    fontWeight: FontWeight.w600)),
          ),
        ),
      );
}
