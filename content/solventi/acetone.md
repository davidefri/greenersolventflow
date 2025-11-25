---
# DATI STRUTTURATI (FRONT MATTER)
# Questa parte DEVE essere YAML e serve a Hugo per la visualizzazione e la ricerca.
title: "Acetone"

# 🗃️ DATI IDENTIFICATIVI
cas: "67-64-1"
formula_chimica: "C3H6O"
massa_molare: "58.08 g/mol"
categoria: "Aprotico Polare"

# 🧪 DATI CHIMICO-FISICI
densita: "0.7899 g/cm³ (20°C)"
punto_ebollizione: "56 °C"
polarita: "5.1 (Debye)"
indice_rifrazione: "1.358"

# ⚠️ FRASI H (Usiamo un array/lista YAML)
frasi_h: 
  - "H225 - Liquido e vapori facilmente infiammabili."
  - "H319 - Provoca grave irritazione oculare."
  - "H336 - Può provocare sonnolenza o vertigini."

# 🖼️ RISORSE (Per la struttura chimica)
immagine_struttura: "/images/strutture/acetone.png"

# Parametri Hugo standard (non toccare per ora)
date: 2025-11-24T11:00:00+01:00
draft: false # Settalo a 'true' se non vuoi pubblicarlo subito
---