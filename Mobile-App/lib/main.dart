import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'constants.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/shell_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MaisonNoirApp());
}

class MaisonNoirApp extends StatelessWidget {
  const MaisonNoirApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAISON NOIR',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: kBlack,
        colorScheme: const ColorScheme.dark(
          primary: kBrandText,
          secondary: kBrand,
          surface: kBg2,
          onSurface: kIvory,
          error: kRed,
        ),
        textTheme: GoogleFonts.montserratTextTheme(
          ThemeData.dark().textTheme,
        ).apply(bodyColor: kIvory, displayColor: kIvory),
        dividerColor: kBorder,
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checking = true;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkToken();
  }

  Future<void> _checkToken() async {
    final token = await ApiService.getToken();
    if (!mounted) return;
    setState(() {
      _loggedIn = token != null && token.isNotEmpty;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: kBlack,
        body: Center(
          child: CircularProgressIndicator(color: kBrandText),
        ),
      );
    }
    if (_loggedIn) {
      return ShellScreen(onLogout: () {
        if (mounted) setState(() => _loggedIn = false);
      });
    }
    return LoginScreen(onLogin: () {
      if (mounted) setState(() => _loggedIn = true);
    });
  }
}
