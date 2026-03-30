import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class NewOrderScreen extends StatefulWidget {
  const NewOrderScreen({super.key});
  @override
  State<NewOrderScreen> createState() => _NewOrderScreenState();
}

class _NewOrderScreenState extends State<NewOrderScreen> {
  List<dynamic> _clients  = [];
  List<dynamic> _products = [];
  Map<String, dynamic>? _selectedClient;
  List<_OrderLine> _lines = [_OrderLine()];
  bool _loadingData = true;
  bool _submitting  = false;
  bool _success     = false;
  String _error     = '';
  Map<String, dynamic>? _createdOrder;
  final _fmt = NumberFormat('#,###', 'fr');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.getClients(),
        ApiService.getVariants(),
      ]);
      setState(() {
        _clients  = results[0];
        _products = results[1];
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  double get _total => _lines.fold(0, (s, l) {
        if (l.productId == null) return s;
        final p = _products.firstWhere(
            (x) => x['id'] == l.productId,
            orElse: () => null);
        if (p == null) return s;
        return s + (p['list_price'] as num).toDouble() * l.qty;
      });

  Future<void> _submit() async {
    if (_selectedClient == null) {
      setState(() => _error = 'Veuillez sélectionner un client.');
      return;
    }
    if (_lines.any((l) => l.productId == null)) {
      setState(() => _error = 'Tous les produits doivent être sélectionnés.');
      return;
    }
    setState(() { _submitting = true; _error = ''; });
    try {
      final lines = _lines.map((l) => {
        'product_id': l.productId!,
        'qty':        l.qty,
      }).toList();
      final res = await ApiService.createOrder(
          _selectedClient!['id'] as int, lines);
      setState(() { _success = true; _createdOrder = res['data'] as Map<String, dynamic>?; });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Erreur lors de la création de la commande.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _fmtMad(double v) => '${_fmt.format(v)} MAD';

  @override
  Widget build(BuildContext context) {
    if (_loadingData) return const AppSpinner();
    if (_success) return _buildSuccess();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(eyebrow: 'Odoo', title: 'Nouvelle Commande'),
          const SizedBox(height: 24),

          if (_error.isNotEmpty) ...[
            ErrorCard(message: _error),
            const SizedBox(height: 16),
          ],

          // ── Client picker ────────────────────────────────────────────────
          _card(
            label: 'CLIENT',
            child: DropdownButtonFormField<Map<String, dynamic>>(
              value: _selectedClient, // ignore: deprecated_member_use
              dropdownColor: kBg3,
              style: const TextStyle(color: kIvory, fontSize: 14),
              decoration: _inputDeco('Sélectionner un client…'),
              items: _clients.map((c) => DropdownMenuItem(
                    value: c as Map<String, dynamic>,
                    child: Text(c['name'] as String? ?? ''),
                  )).toList(),
              onChanged: (v) => setState(() => _selectedClient = v),
            ),
          ),
          const SizedBox(height: 12),

          // ── Order lines ──────────────────────────────────────────────────
          _card(
            label: 'LIGNES DE COMMANDE',
            child: Column(
              children: [
                ..._lines.asMap().entries.map((e) {
                  final i = e.key;
                  final l = e.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        // product dropdown
                        Expanded(
                          flex: 3,
                          child: DropdownButtonFormField<int>(
                            value: l.productId, // ignore: deprecated_member_use
                            dropdownColor: kBg3,
                            style: const TextStyle(
                                color: kIvory, fontSize: 13),
                            decoration: _inputDeco('Produit'),
                            isExpanded: true,
                            items: _products.map((p) => DropdownMenuItem<int>(
                                  value: p['id'] as int,
                                  child: Text(
                                    '${p['name']}${p['default_code'] != null && p['default_code'] != false ? ' [${p['default_code']}]' : ''}',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                )).toList(),
                            onChanged: (v) => setState(() => l.productId = v),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // qty
                        SizedBox(
                          width: 64,
                          child: TextFormField(
                            key: ValueKey('qty_$i'),
                            initialValue: '${l.qty.toInt()}',
                            keyboardType: TextInputType.number,
                            style: const TextStyle(
                                color: kIvory, fontSize: 14),
                            textAlign: TextAlign.center,
                            decoration: _inputDeco('Qté'),
                            onChanged: (v) => setState(
                                () => l.qty = double.tryParse(v) ?? 1),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // delete
                        IconButton(
                          icon: Icon(Icons.delete_outline,
                              size: 18,
                              color: _lines.length > 1 ? kGray : kGray2),
                          onPressed: _lines.length > 1
                              ? () => setState(() => _lines.removeAt(i))
                              : null,
                        ),
                      ],
                    ),
                  );
                }),

                // add line button
                GestureDetector(
                  onTap: () =>
                      setState(() => _lines.add(_OrderLine())),
                  child: Row(
                    children: const [
                      Icon(Icons.add_circle_outline,
                          color: kBrandText, size: 16),
                      SizedBox(width: 6),
                      Text('Ajouter une ligne',
                          style: TextStyle(
                              color: kBrandText,
                              fontSize: 12,
                              letterSpacing: 1)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // ── Total ────────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            decoration: BoxDecoration(
              color: kBrand.withValues(alpha: 0.08),
              border: Border.all(color: kBorder),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('TOTAL ESTIMÉ',
                    style: TextStyle(
                        fontSize: 10,
                        color: kGray,
                        letterSpacing: 2)),
                Text(_fmtMad(_total),
                    style: const TextStyle(
                        fontSize: 22,
                        color: kBrandText,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          BrandButton(
            label: 'Enregistrer la commande',
            loading: _submitting,
            onPressed: _submit,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSuccess() => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: kGreen.withValues(alpha: 0.1),
                  border: Border.all(color: kGreen, width: 2),
                ),
                child: const Icon(Icons.check_circle_outline,
                    color: kGreen, size: 36),
              ),
              const SizedBox(height: 24),
              const Text('Commande Créée !',
                  style: TextStyle(
                      fontSize: 26,
                      color: kIvory,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(_createdOrder?['name'] as String? ?? '',
                  style: const TextStyle(color: kBrandText,
                      fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 32),
              BrandButton(
                label: 'Nouvelle commande',
                onPressed: () => setState(() {
                  _success = false;
                  _lines = [_OrderLine()];
                  _selectedClient = null;
                  _createdOrder = null;
                }),
              ),
            ],
          ),
        ),
      );

  Widget _card({required String label, required Widget child}) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: kBg2,
          border: Border.all(color: kBorder),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 9,
                    color: kBrandText,
                    letterSpacing: 2.5,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            child,
          ],
        ),
      );

  InputDecoration _inputDeco(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: kGray2, fontSize: 13),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.04),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: kBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: kBrandText),
        ),
      );
}

class _OrderLine {
  int? productId;
  double qty = 1;
  _OrderLine();
}
