import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLogin;
  const LoginScreen({super.key, required this.onLogin});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _loading    = false;
  bool _obscure    = true;
  String _error    = '';
  late AnimationController _fade;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 500));
    _fadeAnim = CurvedAnimation(parent: _fade, curve: Curves.easeOut);
    _fade.forward();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _fade.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() { _loading = true; _error = ''; });
    try {
      await ApiService.login(_emailCtrl.text.trim(), _passCtrl.text);
      if (!mounted) return;
      widget.onLogin();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'Erreur: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(statusBarColor: Colors.transparent));
    return Scaffold(
      backgroundColor: kBlack,
      body: Stack(
        children: [
          // ── Background glows ──────────────────────────────────────────────
          Positioned(top: -80, left: -60,
            child: _glow(360, kBrand.withValues(alpha: 0.35))),
          Positioned(bottom: -80, right: -60,
            child: _glow(280, kBrandText.withValues(alpha: 0.12))),

          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // ── Logo block ────────────────────────────────────────
                      Text('MAISON NOIR',
                          style: GoogleFonts.playfairDisplay(
                              fontSize: 28,
                              color: kBrandText,
                              letterSpacing: 6,
                              fontWeight: FontWeight.w500)),
                      const SizedBox(height: 6),
                      const Text('PORTAIL COLLABORATEURS',
                          style: TextStyle(
                              fontSize: 9,
                              letterSpacing: 5,
                              color: kGray,
                              fontWeight: FontWeight.w500)),
                      const SizedBox(height: 16),
                      // gradient line
                      Container(
                        height: 1,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [
                            Colors.transparent,
                            kBrandText.withValues(alpha: 0.4),
                            Colors.transparent,
                          ]),
                        ),
                      ),
                      const SizedBox(height: 40),

                      // ── Form card ─────────────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: kBg2,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: kBorder),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                blurRadius: 40,
                                offset: const Offset(0, 16)),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_error.isNotEmpty) ...[
                              ErrorCard(message: _error),
                              const SizedBox(height: 12),
                            ],

                            _fieldLabel('Adresse e-mail'),
                            const SizedBox(height: 8),
                            _textField(
                              controller: _emailCtrl,
                              hint: 'prenom.nom@maisonnoir.ma',
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 16),

                            _fieldLabel('Mot de passe'),
                            const SizedBox(height: 8),
                            _textField(
                              controller: _passCtrl,
                              hint: '••••••••••',
                              obscure: _obscure,
                              suffix: IconButton(
                                icon: Icon(
                                  _obscure
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  size: 18,
                                  color: kGray,
                                ),
                                onPressed: () =>
                                    setState(() => _obscure = !_obscure),
                              ),
                            ),
                            const SizedBox(height: 28),

                            BrandButton(
                              label: 'Se connecter',
                              loading: _loading,
                              onPressed: _login,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 40),
                      const Text(
                          'LUXURY READY-TO-WEAR · CASABLANCA',
                          style: TextStyle(
                              fontSize: 9,
                              letterSpacing: 4,
                              color: kGray2)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _glow(double size, Color color) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, Colors.transparent]),
        ),
      );

  Widget _fieldLabel(String text) => Text(text.toUpperCase(),
      style: const TextStyle(
          fontSize: 9, letterSpacing: 2.5, color: kGray, fontWeight: FontWeight.w600));

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    bool obscure = false,
    TextInputType? keyboardType,
    Widget? suffix,
  }) =>
      TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        style: const TextStyle(color: kIvory, fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: kGray2, fontSize: 13),
          suffixIcon: suffix,
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.04),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: kBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: kBrandText),
          ),
        ),
      );
}
