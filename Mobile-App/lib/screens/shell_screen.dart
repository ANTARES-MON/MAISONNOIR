import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import 'dashboard_screen.dart';
import 'clients_screen.dart';
import 'products_screen.dart';
import 'orders_screen.dart';
import 'new_order_screen.dart';
import 'login_screen.dart';

class ShellScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const ShellScreen({super.key, required this.onLogout});
  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _tab = 0;
  Map<String, dynamic>? _user;
  bool _isManager = false;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final u = await ApiService.getUser();
    if (mounted) {
      setState(() {
        _user = u;
        _isManager = (u?['is_manager'] as bool?) ?? false;
        _tab = _isManager ? 0 : 0;
      });
    }
  }

  Future<void> _logout() async {
    await ApiService.logout();
    widget.onLogout();
  }

  List<_NavItem> get _navItems {
    final items = <_NavItem>[];
    if (_isManager) {
      items.add(const _NavItem(Icons.dashboard_outlined,
          Icons.dashboard_rounded, 'Tableau de bord'));
    }
    items.addAll([
      const _NavItem(Icons.people_outline, Icons.people_rounded, 'Clients'),
      const _NavItem(
          Icons.inventory_2_outlined, Icons.inventory_2_rounded, 'Produits'),
      const _NavItem(Icons.receipt_long_outlined,
          Icons.receipt_long_rounded, 'Commandes'),
      const _NavItem(
          Icons.add_circle_outline, Icons.add_circle_rounded, 'Nouvelle vente'),
    ]);
    return items;
  }

  Widget _buildPage() {
    if (_user == null) return const AppSpinner();
    final items = _navItems;
    final label = items[_tab].label;
    if (label == 'Tableau de bord') return const DashboardScreen();
    if (label == 'Clients') return const ClientsScreen();
    if (label == 'Produits') return const ProductsScreen();
    if (label == 'Commandes') return OrdersScreen(isManager: _isManager);
    if (label == 'Nouvelle vente') return const NewOrderScreen();
    return const AppSpinner();
  }

  @override
  Widget build(BuildContext context) {
    final items = _navItems;
    return Scaffold(
      backgroundColor: kBlack,
      appBar: AppBar(
        backgroundColor: kBg2,
        elevation: 0,
        centerTitle: false,
        title: Text('MAISON NOIR',
            style: GoogleFonts.playfairDisplay(
                fontSize: 18, color: kBrandText, letterSpacing: 3)),
        actions: [
          if (_user != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Text(
                  (_user!['name'] as String? ?? '').split(' ').first,
                  style: const TextStyle(fontSize: 12, color: kGray),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 20, color: kGray),
            tooltip: 'Déconnexion',
            onPressed: _logout,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: kBorder),
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: KeyedSubtree(
          key: ValueKey(_tab),
          child: _buildPage(),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: kBg2,
          border: Border(top: BorderSide(color: kBorder, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _tab,
          onTap: (i) => setState(() => _tab = i),
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: kBrandText,
          unselectedItemColor: kGray,
          selectedFontSize: 9,
          unselectedFontSize: 9,
          selectedLabelStyle:
              const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5),
          items: items
              .asMap()
              .entries
              .map((e) => BottomNavigationBarItem(
                    icon: Icon(e.value.icon, size: 22),
                    activeIcon: Icon(e.value.activeIcon, size: 22),
                    label: e.value.label,
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem(this.icon, this.activeIcon, this.label);
}
