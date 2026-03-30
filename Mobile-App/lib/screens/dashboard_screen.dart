import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String _error = '';
  final _fmt = NumberFormat('#,###', 'fr');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final d = await ApiService.getDashboard();
      setState(() => _data = d);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Impossible de charger le tableau de bord.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmtMad(dynamic v) =>
      '${_fmt.format((v as num?)?.toDouble() ?? 0)} MAD';

  String _fmtDate(String? d) {
    if (d == null) return '—';
    try {
      return DateFormat('dd/MM/yyyy', 'fr').format(DateTime.parse(d));
    } catch (_) { return d; }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const AppSpinner();
    if (_error.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: ErrorCard(message: _error, onRetry: _load),
      );
    }

    final stats  = _data!['stats']  as Map<String, dynamic>;
    final recent = (_data!['recent_orders'] as List?) ?? [];

    return RefreshIndicator(
      color: kBrandText,
      backgroundColor: kBg2,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SectionHeader(eyebrow: 'Vue d\'ensemble', title: 'Tableau de Bord'),
          const SizedBox(height: 24),

          // ── Stat grid ──────────────────────────────────────────────────────
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.3,
            children: [
              StatCard(
                label: 'Revenu confirmé',
                value: _fmtMad(stats['revenue']),
                icon: Icons.trending_up_rounded,
                highlight: true,
              ),
              StatCard(
                label: 'Commandes',
                value: '${stats['orders'] ?? 0}',
                icon: Icons.receipt_long_rounded,
              ),
              StatCard(
                label: 'Clients actifs',
                value: '${stats['clients'] ?? 0}',
                icon: Icons.people_rounded,
              ),
              StatCard(
                label: 'Produits',
                value: '${stats['products'] ?? 0}',
                icon: Icons.inventory_2_rounded,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // ── Recent orders ─────────────────────────────────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Dernières Commandes',
                  style: GoogleFonts.playfairDisplay(
                      fontSize: 20, color: kIvory)),
              Text('${recent.length} affichées',
                  style: const TextStyle(fontSize: 11, color: kGray)),
            ],
          ),
          const SizedBox(height: 12),

          Container(
            decoration: BoxDecoration(
              color: kBg2,
              border: Border.all(color: kBorder),
              borderRadius: BorderRadius.circular(10),
            ),
            child: recent.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                        child: Text('Aucune commande',
                            style: TextStyle(color: kGray))))
                : Column(
                    children: recent.asMap().entries.map((e) {
                      final o = e.value as Map<String, dynamic>;
                      final isLast = e.key == recent.length - 1;
                      return Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(o['name'] ?? '—',
                                          style: const TextStyle(
                                              color: kBrandText,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13)),
                                      const SizedBox(height: 3),
                                      Text(
                                        (o['partner_id'] is List
                                            ? o['partner_id'][1]
                                            : '—') as String,
                                        style: const TextStyle(
                                            fontSize: 12, color: kGray),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _fmtDate(o['date_order'] as String?),
                                        style: const TextStyle(
                                            fontSize: 10, color: kGray2),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(_fmtMad(o['amount_total']),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: kIvory)),
                                    const SizedBox(height: 4),
                                    StatusBadge(o['state'] as String? ?? 'draft'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          if (!isLast) const BrandDivider(),
                        ],
                      );
                    }).toList(),
                  ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
