import 'package:flutter/material.dart';

const kBlack     = Color(0xFF0F0F0F);
const kBg2       = Color(0xFF181818);
const kBg3       = Color(0xFF212121);
const kBrand     = Color(0xFF49111C);
const kBrandMid  = Color(0xFF6B1929);
const kBrandText = Color(0xFFB85060);
const kIvory     = Color(0xFFF5F0E8);
const kGray      = Color(0xFF888888);
const kGray2     = Color(0xFF555555);
const kGreen     = Color(0xFF2ECC71);
const kRed       = Color(0xFFE74C3C);
const kBorder    = Color(0x5949111C);

// ─── API base ─────────────────────────────────────────────────────────────────
// Choisir l'adresse selon l'environnement d'exécution :
//
//  ① Émulateur Android         → 10.0.2.2  (alias de localhost hôte)
//     const kApiBase = 'http://10.0.2.2:8000/api';
//
//  ② Simulateur iOS (mac)      → 127.0.0.1
//     const kApiBase = 'http://127.0.0.1:8000/api';
//
//  ③ Device physique (WiFi)    → IP LAN de la machine (ex. ifconfig | grep 192.168)
//     const kApiBase = 'http://192.168.1.X:8000/api';
//
// ⚠️  Vérification rapide : `curl http://<adresse>:8000/api/login` doit retourner 405
// ─────────────────────────────────────────────────────────────────────────────

// 👇 Modifiez ici selon votre cas :
const kApiBase = 'http://192.168.1.11:8000/api'; // ← émulateur Android (défaut)
