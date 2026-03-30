import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:maisonnoir_mobile/main.dart';

void main() {
  testWidgets('AuthGate shows spinner while checking token', (tester) async {
    await tester.pumpWidget(const MaisonNoirApp());
    // Shows loading indicator initially
    expect(find.byType(CircularProgressIndicator), findsWidgets);
  });
}
