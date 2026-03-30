import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants.dart';

// ─── Spinner ──────────────────────────────────────────────────────────────────
class AppSpinner extends StatelessWidget {
  const AppSpinner({super.key});
  @override
  Widget build(BuildContext context) => const Center(
        child: CircularProgressIndicator(color: kBrandText, strokeWidth: 2),
      );
}

// ─── Error card ───────────────────────────────────────────────────────────────
class ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorCard({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(vertical: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: kRed.withValues(alpha: 0.08),
          border: Border.all(color: kRed.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Color(0xFFE07070), size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(message,
                  style: const TextStyle(color: Color(0xFFE07070), fontSize: 13)),
            ),
            if (onRetry != null) ...[
              const SizedBox(width: 8),
              TextButton(
                onPressed: onRetry,
                child: const Text('Réessayer',
                    style: TextStyle(color: kBrandText, fontSize: 12)),
              ),
            ],
          ],
        ),
      );
}

// ─── Section header ───────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  const SectionHeader({super.key, required this.eyebrow, required this.title});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(eyebrow.toUpperCase(),
              style: const TextStyle(
                  fontSize: 10,
                  letterSpacing: 3,
                  color: kBrandText,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(title,
              style: GoogleFonts.playfairDisplay(
                  fontSize: 28, color: kIvory, fontWeight: FontWeight.w500)),
        ],
      );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String state;
  const StatusBadge(this.state, {super.key});

  static const _labels = {
    'draft':  ('Brouillon', Color(0x1A888888), kGray),
    'sent':   ('Envoyée',   Color(0x1A2ECC71), kGreen),
    'sale':   ('Confirmée', Color(0x1A2ECC71), kGreen),
    'done':   ('Terminée',  Color(0x1A2ECC71), kGreen),
    'cancel': ('Annulée',   Color(0x1AE74C3C), kRed),
  };

  @override
  Widget build(BuildContext context) {
    final info = _labels[state] ?? ('Inconnu', const Color(0x1A888888), kGray);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: info.$2,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: info.$3.withValues(alpha: 0.4)),
      ),
      child: Text(info.$1.toUpperCase(),
          style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: info.$3)),
    );
  }
}

// ─── Divider ──────────────────────────────────────────────────────────────────
class BrandDivider extends StatelessWidget {
  const BrandDivider({super.key});
  @override
  Widget build(BuildContext context) =>
      Divider(color: kBorder, height: 1, thickness: 1);
}

// ─── Value tile ───────────────────────────────────────────────────────────────
class ValueTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const ValueTile(
      {super.key,
      required this.label,
      required this.value,
      this.valueColor});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: const TextStyle(fontSize: 13, color: kGray)),
            Flexible(
              child: Text(value,
                  textAlign: TextAlign.end,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: valueColor ?? kIvory)),
            ),
          ],
        ),
      );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool highlight;
  const StatCard(
      {super.key,
      required this.label,
      required this.value,
      required this.icon,
      this.highlight = false});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: kBg2,
          border: Border.all(color: kBorder),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: kBrandText, size: 20),
            const SizedBox(height: 10),
            Text(label.toUpperCase(),
                style: const TextStyle(
                    fontSize: 9,
                    color: kGray,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.playfairDisplay(
                    fontSize: 22,
                    color: highlight ? kBrandText : kIvory,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      );
}

// ─── Brand button ─────────────────────────────────────────────────────────────
class BrandButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  const BrandButton(
      {super.key,
      required this.label,
      this.onPressed,
      this.loading = false});

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        height: 50,
        child: ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: kBrand,
            foregroundColor: Colors.white,
            disabledBackgroundColor: kBrand.withValues(alpha: 0.4),
            elevation: 0,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
          ),
          child: loading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2))
              : Text(label.toUpperCase(),
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2)),
        ),
      );
}
