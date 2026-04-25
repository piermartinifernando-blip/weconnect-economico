"""
actualizar_dashboard.py — WeConnect
Procesa los 3 CSVs de ISPCube y actualiza App.jsx automáticamente.

USO:
  1. Colocar este script en la carpeta weconnect-economico/sync/
  2. Colocar los 3 CSVs en la misma carpeta
  3. Ejecutar: python sync/actualizar_dashboard.py
  4. El script actualiza src/App.jsx listo para subir a GitHub

DATOS MANUALES (no vienen de CSV — no se tocan):
  - OPEX, CAPEX, OBRA (cajas/fibra), VEND_VALS, proyecciones RED_PROJ/BE_PROJ
  - PL_HIST cobrado se actualiza pero opex/capex son manuales
"""

import pandas as pd
import re
import os
import sys
from datetime import datetime, timezone

# ── RUTAS ─────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(BASE_DIR)
APP_PATH   = os.path.join(ROOT_DIR, 'src', 'App.jsx')

# ── LEER CSV ──────────────────────────────────────────────────────────
def leer(fname):
    path = os.path.join(BASE_DIR, fname)
    if not os.path.exists(path):
        print(f"  ⚠️  No encontrado: {path}")
        return None
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        l1 = f.readline()
    sep = ';' if l1.count(';') > l1.count(',') else ','
    df = pd.read_csv(path, sep=sep, encoding='utf-8', on_bad_lines='skip', low_memory=False)
    df.columns = df.columns.str.strip()
    print(f"  ✅ {fname}: sep='{sep}' | {len(df)} filas")
    return df

# ── CALCULAR TODOS LOS VALORES ────────────────────────────────────────
def calcular(customers, cash, bills):
    V = {}  # diccionario de todos los valores calculados

    # ════════════════════════════════════════════════════════════════
    # CLIENTES
    # ════════════════════════════════════════════════════════════════
    customers['Deuda']         = pd.to_numeric(customers['Deuda'].astype(str).str.replace(',','.'), errors='coerce').fillna(0)
    customers['Deuda vencida'] = pd.to_numeric(customers['Deuda vencida'].astype(str).str.replace(',','.'), errors='coerce').fillna(0)
    customers['Fecha alta']    = pd.to_datetime(customers['Fecha alta'],       format='mixed', dayfirst=True, errors='coerce')
    customers['Fecha bloqueo'] = pd.to_datetime(customers['Fecha de bloqueo'], format='mixed', dayfirst=True, errors='coerce')
    customers['mes_alta']      = customers['Fecha alta'].dt.to_period('M')
    customers['mes_bloqueo']   = customers['Fecha bloqueo'].dt.to_period('M')

    V['HAB']   = int((customers['Estado']=='Habilitado').sum())
    V['BLOQ']  = int((customers['Estado']=='Bloqueado').sum())
    V['SS']    = int((customers['Estado']=='Sin servicio').sum())
    V['TOTAL'] = int(len(customers))

    # Mora
    V['MORA_TOTAL'] = round(customers['Deuda'].sum()/1e6, 2)
    V['MORA_VENC']  = round(customers['Deuda vencida'].sum()/1e6, 2)
    V['MORA_SS']    = round(customers[customers['Estado']=='Sin servicio']['Deuda'].sum()/1e6, 2)
    V['MORA_BLOQ']  = round(customers[customers['Estado']=='Bloqueado']['Deuda'].sum()/1e6, 2)
    V['MORA_HAB']   = round(customers[customers['Estado']=='Habilitado']['Deuda'].sum()/1e6, 2)
    V['MORA_MOROSOS'] = V['SS'] + V['BLOQ']
    V['MORA_PCT']   = round(V['MORA_MOROSOS']/V['TOTAL']*100, 1)

    # Ciudades
    CIUDADES = ['Almirante Brown','Capitan Sarmiento','Ministro Rivadavia','Glew','Longchamps','Florencio Varela','Burzaco']
    city_data = []
    city_hab=[]; city_total=[]; city_mora=[]
    for c in CIUDADES:
        sub = customers[customers['Ciudad']==c]
        hab = int((sub['Estado']=='Habilitado').sum())
        tot = int(len(sub))
        dv  = round(sub['Deuda vencida'].sum()/1e6, 2)
        city_data.append({'ciudad':c,'habilitados':hab,'total':tot,'deudaVenc':dv})
        city_hab.append(hab); city_total.append(tot); city_mora.append(dv)
    V['CIUDADES']   = city_data
    V['CITY_HAB']   = city_hab
    V['CITY_TOTAL'] = city_total
    V['CITY_MORA']  = city_mora

    # Planes habilitados
    hab = customers[customers['Estado']=='Habilitado'].copy()
    hab['plan_base'] = hab['Plan'].str.split('|').str[0].str.strip()
    planes_count = hab['plan_base'].value_counts()
    planes_principales = ['100 MB','300 MB','50 MB','600 MB','30 MB']
    planes_data = []
    colors = {'100 MB':'#38BDF8','300 MB':'#1A7A3C','50 MB':'#7B5EA7','600 MB':'#C47A00','30 MB':'#1A5FBF'}
    total_hab = V['HAB']
    for p in planes_principales:
        cli = int(planes_count.get(p, 0))
        pct = round(cli/total_hab*100, 1) if total_hab>0 else 0
        planes_data.append({'plan':p,'cli':cli,'pct':pct,'color':colors.get(p,'#9AACBC')})
    V['PLANES'] = planes_data

    # SS sin deuda
    ss_df = customers[customers['Estado']=='Sin servicio']
    V['SS_SIN_DEUDA']  = int((ss_df['Deuda']==0).sum())
    V['SS_POCA_DEUDA'] = int(((ss_df['Deuda']>0) & (ss_df['Deuda']<=24000)).sum())
    V['SS_RECUPERABLE']= V['SS_SIN_DEUDA'] + V['SS_POCA_DEUDA']

    # Menores (DNI 48M-90M extraído del CUIL)
    customers['dni_num'] = pd.to_numeric(
        customers['Número Doc.'].astype(str).str.replace('[^0-9]','',regex=True).str[:8],
        errors='coerce'
    )
    menores = customers[(customers['dni_num']>=48000000) & (customers['dni_num']<=90000000)]
    V['MENORES_TOTAL'] = int(len(menores))
    V['MENORES_HAB']   = int((menores['Estado']=='Habilitado').sum())
    V['MENORES_SS']    = int((menores['Estado']=='Sin servicio').sum())
    V['MENORES_BLOQ']  = int((menores['Estado']=='Bloqueado').sum())

    # Bloqueados análisis
    bloq_df = customers[customers['Estado']=='Bloqueado'].copy()
    HOY = pd.Timestamp('today').normalize()
    bloq_df['dias'] = (HOY - bloq_df['Fecha bloqueo']).dt.days
    V['BLOQ_DIAS_PROM']  = int(bloq_df['dias'].mean()) if len(bloq_df)>0 else 0
    V['BLOQ_MENOS_30']   = int((bloq_df['dias']<30).sum()) if len(bloq_df)>0 else 0
    V['BLOQ_MAS_45']     = int((bloq_df['dias']>=45).sum()) if len(bloq_df)>0 else 0
    V['MORA_BLOQ_DEU_V'] = round(bloq_df['Deuda vencida'].sum()/1e6, 2) if len(bloq_df)>0 else 0

    # ════════════════════════════════════════════════════════════════
    # CHURN — método real: SS + fecha bloqueo ese mes
    # ════════════════════════════════════════════════════════════════
    MESES_8  = ['2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03']
    LABELS_8 = ['Ago 25','Sep 25','Oct 25','Nov 25','Dic 25','Ene 26','Feb 26','Mar 26']
    MESES_12  = ['2025-04','2025-05','2025-06','2025-07'] + MESES_8
    LABELS_12 = ['Abr 25','May 25','Jun 25','Jul 25'] + LABELS_8

    # ALTAS_V
    altas_v = [int((customers['mes_alta'].astype(str)==m).sum()) for m in MESES_8]
    V['ALTAS_V'] = altas_v

    # CHURNS_V
    churns_v = [int(((customers['Estado']=='Sin servicio') & (customers['mes_bloqueo'].astype(str)==m)).sum()) for m in MESES_8]
    V['CHURNS_V'] = churns_v

    # CHURN mes actual (último mes)
    V['CHURN_ABS_ACT'] = churns_v[-1]
    V['CHURN_PCT_ACT'] = round(churns_v[-1]/V['HAB']*100, 2)

    # CHURN_MENS — últimos 12 meses
    churn_mens = []
    for m, lbl in zip(MESES_12, LABELS_12):
        n   = int(((customers['Estado']=='Sin servicio') & (customers['mes_bloqueo'].astype(str)==m)).sum())
        pct = round(n/V['HAB']*100, 2)
        churn_mens.append({'mes':lbl,'pct':pct,'cant':n})
    V['CHURN_MENS'] = churn_mens

    # CHURN_PCT anual implícito
    V['CHURN_PCT'] = round(V['CHURN_PCT_ACT']*12, 1)
    V['CHURN_ABS'] = int(sum(churns_v)/len(churns_v))  # promedio mensual

    # Churn operativo tabla (últimos 8 meses)
    churn_tabla = []
    for m, lbl in zip(MESES_8, LABELS_8):
        sub      = customers[customers['mes_bloqueo'].astype(str)==m]
        churn_n  = int((sub['Estado']=='Sin servicio').sum())
        reactiv  = int((sub['Estado']=='Habilitado').sum())
        tot      = int(len(sub))
        pct_rec  = round(reactiv/tot*100,1) if tot>0 else 0
        deu      = int(sub[sub['Estado']=='Sin servicio']['Deuda'].sum())
        deu_fmt  = f"${deu:,}".replace(',','.')
        churn_tabla.append({'m':lbl,'tot':tot,'reactiv':reactiv,'churn':churn_n,'pct_rec':pct_rec,'deu':deu_fmt})
    V['CHURN_TABLA'] = churn_tabla

    # Vida media SS
    ss_vida = customers[customers['Estado']=='Sin servicio'].copy()
    ss_vida['meses'] = (HOY - ss_vida['Fecha alta']).dt.days / 30
    V['VIDA_MEDIA']  = round(ss_vida['meses'].mean(), 1)
    V['VIDA_MEDIAN'] = round(ss_vida['meses'].median(), 1)

    # Cohorts por cohorte de alta (para tabla acumulada)
    MESES_COH = [
        ('2024-08','Ago 24'),('2024-09','Sep 24'),('2024-10','Oct 24'),('2024-11','Nov 24'),('2024-12','Dic 24'),
        ('2025-01','Ene 25'),('2025-02','Feb 25'),('2025-03','Mar 25'),('2025-04','Abr 25'),('2025-05','May 25'),
        ('2025-06','Jun 25'),('2025-07','Jul 25'),('2025-08','Ago 25'),('2025-09','Sep 25'),('2025-10','Oct 25'),
        ('2025-11','Nov 25'),('2025-12','Dic 25'),('2026-01','Ene 26'),('2026-02','Feb 26'),('2026-03','Mar 26'),
    ]
    cohorts_q = [
        {'rango':'2024 Q1-Q2 (>18m)',   'meses':['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06','2024-07']},
        {'rango':'2024 Q3-Q4 (12-18m)', 'meses':['2024-08','2024-09','2024-10','2024-11','2024-12']},
        {'rango':'2025 Q1-Q2 (6-12m)',  'meses':['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07']},
        {'rango':'2025 Q3-Q4 (3-6m)',   'meses':['2025-08','2025-09','2025-10','2025-11','2025-12']},
        {'rango':'2026 (0-3m)',          'meses':['2026-01','2026-02','2026-03']},
    ]
    cohorts_colors = ['#D13030','#C47A00','#C47A00','#1A7A3C','#1A7A3C']
    cohorts_data = []
    for i, cq in enumerate(cohorts_q):
        sub_all = customers[customers['mes_alta'].astype(str).isin(cq['meses'])]
        if len(sub_all)==0: continue
        inact = int((sub_all['Estado']=='Sin servicio').sum())
        pct   = round(inact/len(sub_all)*100,1)
        cohorts_data.append({'c':f"Cohorte {cq['rango']}",'pct':pct,'inact':inact,'color':cohorts_colors[i]})
    V['COHORTS'] = cohorts_data

    # ════════════════════════════════════════════════════════════════
    # CASH
    # ════════════════════════════════════════════════════════════════
    cash['Total_num'] = pd.to_numeric(cash['Total'].astype(str).str.replace(',','.'), errors='coerce').fillna(0)
    cash['Fecha']     = pd.to_datetime(cash['Fecha ingreso'], format='mixed', dayfirst=True, errors='coerce')
    cash['mes']       = cash['Fecha'].dt.to_period('M')

    def canal(d):
        d = str(d).lower()
        if 'mercadopago' in d or 'mercado pago' in d: return 'MP'
        if 'siro' in d: return 'SIRO'
        if 'visa' in d or 'master' in d: return 'Tarjetas'
        if 'pagofacil' in d: return 'PF'
        if 'galicia' in d: return 'Galicia'
        if 'caja' in d or 'debito' in d: return 'Caja'
        return 'Otros'
    cash['canal'] = cash['Destino'].apply(canal)

    cobros_m8=[]; mp8=[]; siro8=[]; visa8=[]; pf8=[]; caja8=[]; gal8=[]
    for m in MESES_8:
        sub = cash[cash['mes'].astype(str)==m]
        tot = round(sub['Total_num'].sum()/1e6, 2)
        c   = sub.groupby('canal')['Total_num'].sum()/1e6
        cobros_m8.append(tot)
        mp8.append(round(c.get('MP',0),2))
        siro8.append(round(c.get('SIRO',0),2))
        visa8.append(round(c.get('Tarjetas',0),2))
        pf8.append(round(c.get('PF',0),2))
        caja8.append(round(c.get('Caja',0),2))
        gal8.append(round(c.get('Galicia',0),2))

    V['COBROS_M8'] = cobros_m8
    V['MP8']   = mp8;   V['SIRO8'] = siro8; V['VISA8'] = visa8
    V['PF8']   = pf8;   V['CAJA8'] = caja8; V['GAL8']  = gal8

    # Mes actual
    V['COB_ACTUAL']   = cobros_m8[-1]
    V['COB_PREV']     = cobros_m8[-2]
    V['COB_VAR_PCT']  = round((cobros_m8[-1]-cobros_m8[-2])/cobros_m8[-2]*100, 1)
    V['SIRO_ABS']     = siro8[-1]
    V['SIRO_PCT']     = round(siro8[-1]/cobros_m8[-1]*100, 1) if cobros_m8[-1]>0 else 0
    V['MP_ABS']       = mp8[-1]
    V['MP_PCT']       = round(mp8[-1]/cobros_m8[-1]*100, 1) if cobros_m8[-1]>0 else 0

    # Canales mes actual (para variables legacy MP/SIRO/VISA/PF/CAJA/GAL)
    V['MP']   = mp8[-1];   V['SIRO'] = siro8[-1]; V['VISA'] = visa8[-1]
    V['PF']   = pf8[-1];   V['CAJA'] = caja8[-1]; V['GAL']  = gal8[-1]

    # ARPU cobrado
    V['ARPU_COB'] = int(V['COB_ACTUAL']*1e6/V['HAB']) if V['HAB']>0 else 0
    V['CLIENTES'] = V['HAB']

    # ════════════════════════════════════════════════════════════════
    # BILLS
    # ════════════════════════════════════════════════════════════════
    bills['Total_num'] = pd.to_numeric(bills['Total'].astype(str).str.replace(',','.'), errors='coerce').fillna(0)
    bills['Fecha']     = pd.to_datetime(bills['Fecha'], format='mixed', dayfirst=True, errors='coerce')
    bills['mes']       = bills['Fecha'].dt.to_period('M')

    mes_act = MESES_8[-1]
    fact_m  = bills[(bills['mes'].astype(str)==mes_act) & (bills['Facturación Mensual']=='Si') & (bills['Anulada']=='No')]
    V['FACT_ACTUAL']  = round(fact_m['Total_num'].sum()/1e6, 2)
    V['TASA_ACTUAL']  = round(V['COB_ACTUAL']/V['FACT_ACTUAL']*100, 1) if V['FACT_ACTUAL']>0 else 0
    V['FACT_SIN_COB'] = round(V['FACT_ACTUAL']-V['COB_ACTUAL'], 2)

    # NETO_HIST — actualizar mes actual con churns reales
    mes_ant = MESES_8[-2]
    V['NETO_HIST_ALTAS_ACT']  = altas_v[-1]
    V['NETO_HIST_CHURNS_ACT'] = churns_v[-1]
    V['NETO_HIST_NETO_ACT']   = altas_v[-1] - churns_v[-1]

    # OBJ actualizado
    altas_pct  = round(altas_v[-1]/420*100, 1)
    churn_meta = 0.50
    churn_pct  = round(churn_meta/V['CHURN_PCT_ACT']*100, 1) if V['CHURN_PCT_ACT']>0 else 0
    V['OBJ_ALTAS_ACT'] = altas_v[-1]; V['OBJ_ALTAS_PCT'] = altas_pct
    V['OBJ_SIRO_ACT']  = V['SIRO_PCT']; V['OBJ_SIRO_PCT'] = round(V['SIRO_PCT']/40*100,1)
    V['OBJ_CHURN_ACT'] = V['CHURN_PCT_ACT']; V['OBJ_CHURN_PCT'] = churn_pct

    # % altas Mar 26 vs meta
    V['ALTAS_PCT_META'] = altas_pct
    V['ALTAS_GAP']      = 420 - altas_v[-1]

    # AB mora %
    ab = customers[customers['Ciudad']=='Almirante Brown']
    V['AB_MORA_PCT'] = round(ab['Deuda vencida'].sum()/customers['Deuda vencida'].sum()*100, 1)

    # Universo recuperable
    V['SS_SIN_DEUDA_N']  = V['SS_SIN_DEUDA']
    V['SS_POCO_DEUDA_N'] = V['SS_POCA_DEUDA']

    return V

# ── FORMATEAR ARRAYS PARA JSX ─────────────────────────────────────────
def arr(lst): return '[' + ','.join(str(x) for x in lst) + ']'

# ── ACTUALIZAR App.jsx ────────────────────────────────────────────────
def actualizar_app(V, app_path):
    with open(app_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # ── VARIABLES SIMPLES ──
    simples = [
        (r'HAB:\s+\d+,.*',        f'HAB:   {V["HAB"]},    // habilitados — CSV actualizado'),
        (r'BLOQ:\s+\d+,.*',       f'BLOQ:   {V["BLOQ"]},    // bloqueados'),
        (r'SS:\s+\d+,.*',         f'SS:    {V["SS"]},    // sin servicio'),
        (r'TOTAL:\s+\d+,.*',      f'TOTAL: {V["TOTAL"]},    // total padrón'),
        (r'MORA_TOTAL:[\d.]+, MORA_VENC:[\d.]+, MORA_SS:[\d.]+, MORA_BLOQ:[\d.]+, MORA_HAB:[\d.]+,',
         f'MORA_TOTAL:{V["MORA_TOTAL"]}, MORA_VENC:{V["MORA_VENC"]}, MORA_SS:{V["MORA_SS"]}, MORA_BLOQ:{V["MORA_BLOQ"]}, MORA_HAB:{V["MORA_HAB"]},'),
        (r'MORA_MOROSOS:\s*\d+,.*', f'MORA_MOROSOS: {V["MORA_MOROSOS"]}, // ss+bloq'),
        (r'MORA_PCT:\s*[\d.]+,.*',  f'MORA_PCT: {V["MORA_PCT"]},'),
        (r'MORA_SS:\s+[\d.]+, MORA_BLOQ:\s+[\d.]+,', f'MORA_SS:    {V["MORA_SS"]}, MORA_BLOQ:   {V["MORA_BLOQ"]},'),
        (r'MORA_VENC:\s+[\d.]+,',   f'MORA_VENC:  {V["MORA_VENC"]},'),
        (r'COBROS_M8:\[[\d.,\s]+\],.*', f'COBROS_M8:{arr(V["COBROS_M8"])},'),
        (r'MP8:\s+\[[\d.,\s]+\],.*',    f'MP8:  {arr(V["MP8"])},'),
        (r'SIRO8:\[[\d.,\s]+\],.*',     f'SIRO8:{arr(V["SIRO8"])},'),
        (r'VISA8:\[[\d.,\s]+\],.*',     f'VISA8:{arr(V["VISA8"])},'),
        (r'PF8:\s+\[[\d.,\s]+\],.*',    f'PF8:  {arr(V["PF8"])},'),
        (r'CAJA8:\[[\d.,\s]+\],.*',     f'CAJA8:{arr(V["CAJA8"])},'),
        (r'GAL8:\s+\[[\d.,\s]+\],.*',   f'GAL8: {arr(V["GAL8"])},'),
        (r'COB_ACTUAL:\s+[\d.]+,.*',    f'COB_ACTUAL:  {V["COB_ACTUAL"]},   // cobrado total'),
        (r'COB_PREV:\s+[\d.]+,.*',      f'COB_PREV:     {V["COB_PREV"]},   // mes anterior'),
        (r'COB_VAR_PCT:\s+[\d.]+,.*',   f'COB_VAR_PCT:  {V["COB_VAR_PCT"]},'),
        (r'SIRO_ABS:\s+[\d.]+,.*',      f'SIRO_ABS:     {V["SIRO_ABS"]},'),
        (r'SIRO_PCT:\s+[\d.]+,.*',      f'SIRO_PCT:     {V["SIRO_PCT"]},'),
        (r'MP_ABS:\s+[\d.]+,.*',        f'MP_ABS:       {V["MP_ABS"]},'),
        (r'MP_PCT:\s+[\d.]+,.*',        f'MP_PCT:       {V["MP_PCT"]},'),
        (r'FACT_ACTUAL:\s+[\d.]+,.*',   f'FACT_ACTUAL: {V["FACT_ACTUAL"]},'),
        (r'TASA_ACTUAL:\s+[\d.]+,.*',   f'TASA_ACTUAL: {V["TASA_ACTUAL"]},'),
        (r'FACT_SIN_COB:[\d.]+,.*',     f'FACT_SIN_COB:{V["FACT_SIN_COB"]},'),
        (r'ALTAS_V:\s*\[[\d,\s]+\],.*', f'ALTAS_V: {arr(V["ALTAS_V"])},'),
        (r'CHURNS_V:\[[\d,\s]+\],.*',   f'CHURNS_V:{arr(V["CHURNS_V"])},  // método real: SS + fecha bloqueo ese mes'),
        (r'CHURN_PCT_ACT:\s+[\d.]+,.*', f'CHURN_PCT_ACT: {V["CHURN_PCT_ACT"]},'),
        (r'CHURN_ABS_ACT:\s+\d+,.*',    f'CHURN_ABS_ACT:  {V["CHURN_ABS_ACT"]},'),
        (r'CHURN_PCT:\s+[\d.]+,.*',     f'CHURN_PCT: {V["CHURN_PCT"]},'),
        (r'CHURN_ABS:\s+\d+,.*',        f'CHURN_ABS: {V["CHURN_ABS"]},'),
        (r'ARPU_COB:\d+,',              f'ARPU_COB:{V["ARPU_COB"]},'),
        (r'CLIENTES:\s+\d+,',           f'CLIENTES: {V["CLIENTES"]},'),
        (r'const ARPU_BE\s+=\s+\d+;.*', f'const ARPU_BE = {V["ARPU_COB"]};  // ARPU cobrado real'),
        (r'MP:\s+[\d.]+,\s+SIRO:\s+[\d.]+,\s+VISA:\s+[\d.]+,', f'MP:   {V["MP"]}, SIRO:  {V["SIRO"]}, VISA: {V["VISA"]},'),
        (r'PF:\s+[\d.]+,\s+CAJA:\s+[\d.]+,\s+GAL:\s+[\d.]+,',  f'PF:    {V["PF"]}, CAJA:   {V["CAJA"]}, GAL:  {V["GAL"]},'),
        (r'CITY_HAB:\s+\[[\d,\s]+\],.*', f'CITY_HAB:  {arr(V["CITY_HAB"])},'),
        (r'CITY_TOTAL:\[[\d,\s]+\],',    f'CITY_TOTAL:{arr(V["CITY_TOTAL"])},'),
        (r'CITY_MORA:\s+\[[\d.,\s]+\],', f'CITY_MORA: {arr(V["CITY_MORA"])},'),
    ]

    for pattern, replacement in simples:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content

    # ── CIUDADES array ──
    ciudades_str = '  CIUDADES:[\n'
    for c in V['CIUDADES']:
        ciudades_str += f'    {{ciudad:"{c["ciudad"]}",    habilitados:{c["habilitados"]}, total:{c["total"]}, deudaVenc:{c["deudaVenc"]}}},\n'
    ciudades_str += '  ],  // CSV actualizado'
    content = re.sub(r'CIUDADES:\[.*?\],\s+// CSV.*', ciudades_str, content, flags=re.DOTALL)

    # ── PLANES array ──
    planes_str = '  PLANES:[\n'
    for p in V['PLANES']:
        planes_str += f'    {{plan:"{p["plan"]}",  cli:{p["cli"]}, pct:{p["pct"]}, color:"{p["color"]}"}},\n'
    planes_str += '  ],'
    content = re.sub(r'PLANES:\[.*?\],', planes_str, content, flags=re.DOTALL)

    # ── CHURN_MENS array ──
    cm_str = '  CHURN_MENS:[\n'
    for r in V['CHURN_MENS']:
        cm_str += f'    {{mes:"{r["mes"]}",pct:{r["pct"]},cant:{r["cant"]}}},\n'
    cm_str += '  ],'
    content = re.sub(r'CHURN_MENS:\[.*?\],', cm_str, content, flags=re.DOTALL)

    # ── CHURN operativo tabla ──
    ct_str = '                  {[\n'
    for r in V['CHURN_TABLA']:
        ct_str += f'                    {{m:"{r["m"]}",tot:{r["tot"]},reactiv:{r["reactiv"]},churn:{r["churn"]},pct_rec:{r["pct_rec"]},deu:"{r["deu"]}"}},\n'
    ct_str += '                  ]'
    content = re.sub(
        r'\{m:"Ago 25",tot:\d+,reactiv:\d+,churn:\d+,pct_rec:[\d.]+,deu:"[^"]+"\}.*?\}.*?\]',
        ct_str.strip(),
        content, flags=re.DOTALL
    )

    # ── NETO_HIST Mar 26 ──
    content = re.sub(
        r'\{mes:"Mar 26", neto:-[\d.]+, altas:\d+, churns:\d+, neto_cli:\d+\}',
        f'{{mes:"Mar 26", neto:-46.2, altas:{V["NETO_HIST_ALTAS_ACT"]}, churns:{V["NETO_HIST_CHURNS_ACT"]}, neto_cli:{V["NETO_HIST_NETO_ACT"]}}}',
        content
    )

    # ── RED_PROJ Hoy ──
    content = re.sub(
        r'\{mes:"Hoy",\s+cajas:\d+,cap:\d+,pen:[\d.]+,churn:[\d.]+,altas:\d+,\s+clientes:\d+,\s+cobrado:[\d.]+,',
        f'{{mes:"Hoy",   cajas:202,cap:2121,pen:0.7,churn:{V["CHURN_PCT_ACT"]},altas:{V["ALTAS_V"][-1]}, clientes:{V["HAB"]}, cobrado:{V["COB_ACTUAL"]},',
        content
    )

    # ── PL_HIST Mar 26 cobrado ──
    content = re.sub(
        r'\{mes:"Mar 26", cobrado:[\d.]+, opex:([\d.]+), capex:([\d.]+), costo:([\d.]+), neto:([-\d.]+)\}',
        lambda m: f'{{mes:"Mar 26", cobrado:{V["COB_ACTUAL"]}, opex:{m.group(1)}, capex:{m.group(2)}, costo:{m.group(3)}, neto:{m.group(4)}}}',
        content
    )

    # ── OBJ ──
    content = re.sub(
        r'altas_actual:\d+,\s+altas_meta:\d+,\s+altas_pct:[\d.]+,',
        f'altas_actual:{V["OBJ_ALTAS_ACT"]},  altas_meta:420,   altas_pct:{V["OBJ_ALTAS_PCT"]},',
        content
    )
    content = re.sub(
        r'siro_actual:[\d.]+,\s+siro_meta:[\d.]+,\s+siro_pct:[\d.]+,',
        f'siro_actual:{V["OBJ_SIRO_ACT"]},  siro_meta:40.0,   siro_pct:{V["OBJ_SIRO_PCT"]},',
        content
    )
    content = re.sub(
        r'churn_actual:[\d.]+,\s+churn_meta:[\d.]+,\s+churn_pct:[\d.]+,.*',
        f'churn_actual:{V["OBJ_CHURN_ACT"]}, churn_meta:0.5,   churn_pct:{V["OBJ_CHURN_PCT"]},',
        content
    )

    # ── TEXTOS HARDCODEADOS ──
    texts = [
        (r'Total bloqueados: <strong>\d+ clientes · \$[\d.]+M deuda vencida</strong>[^"]*"',
         f'Total bloqueados: <strong>{V["BLOQ"]} clientes · ${V["MORA_BLOQ_DEU_V"]}M deuda vencida</strong> · Promedio {V["BLOQ_DIAS_PROM"]} días bloqueado · {V["BLOQ_MENOS_30"]} en ventana recuperación (&lt;30d)"'),
        (r'Mar 26: \d+ SS reales / \d+ altas',
         f'Mar 26: {V["CHURN_ABS_ACT"]} SS reales / {V["ALTAS_V"][-1]} altas'),
        (r'<strong>\d+ churnearon = mejor mes</strong>',
         f'<strong>{V["CHURN_ABS_ACT"]} churnearon = mejor mes</strong>'),
        (r'AB = [\d.]+% de la deuda vencida \(\$[\d.]+M\)',
         f'AB = {V["AB_MORA_PCT"]}% de la deuda vencida (${V["CITY_MORA"][0]}M)'),
        (r'Universo recuperable: <strong>\d+ clientes</strong> · \d+ SS sin deuda \+ \d+ SS',
         f'Universo recuperable: <strong>{V["SS_RECUPERABLE"]} clientes</strong> · {V["SS_SIN_DEUDA_N"]} SS sin deuda + {V["SS_POCO_DEUDA_N"]} SS'),
        (r'Subir la base de <strong>[\d.]+ clientes reales</strong>',
         f'Subir la base de <strong>{V["HAB"]:,} clientes reales</strong>'),
        (r'sub="tasa mensual real · base [\d.]+ hab"',
         f'sub="tasa mensual real · base {V["HAB"]:,} hab"'),
        (r'\d+ clientes en 30/50 MB',
         f'{sum(p["cli"] for p in V["PLANES"] if p["plan"] in ["30 MB","50 MB"])} clientes en 30/50 MB'),
        (r'val:"\d+",\s+sub:"\d+ hab \+ \d+ SS \+ \d+ bl"',
         f'val:"{V["ALTAS_V"][-1]}", sub:"{V["ALTAS_V"][-1] - V["CHURNS_V"][-1] - 1} hab + {V["CHURNS_V"][-1]} SS + 1 bl"'),
        (r'val:"[\d.]+%",\s+sub:"en progreso"',
         f'val:"{V["OBJ_ALTAS_PCT"]}%", sub:"en progreso"'),
        (r'val:"\d+ altas",\s+sub:"para llegar a 420/mes"',
         f'val:"{V["ALTAS_GAP"]} altas", sub:"para llegar a 420/mes"'),
        (r'KPI label="SS sin deuda"\s+value="\d+"',
         f'KPI label="SS sin deuda"          value="{V["SS_SIN_DEUDA"]}"'),
        (r'KPI label="SS deuda ≤\$24k"\s+value="\d+"',
         f'KPI label="SS deuda ≤$24k"        value="{V["SS_POCA_DEUDA"]}"'),
    ]
    for pattern, replacement in texts:
        content = re.sub(pattern, replacement, content)

    return content

# ── MAIN ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print(f"\n{'='*55}")
    print(f"  AUDITORÍA WeConnect — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"{'='*55}\n")

    print("1. Leyendo CSVs...")
    customers = leer('customers.csv') or leer('customers_excel_all__11_.csv')
    cash      = leer('cash.csv')      or leer('cash_excel_all__8_.csv')
    bills     = leer('bills.csv')     or leer('bills_excel_all__7_.csv')

    if customers is None or cash is None or bills is None:
        print("\n❌ Faltan CSVs. Colocar en la carpeta sync/ con nombres:")
        print("   customers.csv, cash.csv, bills.csv")
        print("   (o los nombres originales de ISPCube)")
        sys.exit(1)

    print("\n2. Calculando valores...")
    try:
        V = calcular(customers, cash, bills)
    except Exception as e:
        print(f"❌ Error calculando: {e}")
        raise

    print("\n3. Actualizando App.jsx...")
    content = actualizar_app(V, APP_PATH)

    # Verificar integridad
    opens = content.count('{'); closes = content.count('}')
    if opens != closes:
        print(f"❌ ERROR: llaves desbalanceadas {opens}/{closes}")
        sys.exit(1)

    with open(APP_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n{'='*55}")
    print(f"  ✅ App.jsx actualizado — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"{'='*55}")
    print(f"\n  CLIENTES: {V['HAB']} hab · {V['BLOQ']} bloq · {V['SS']} SS · {V['TOTAL']} total")
    print(f"  COBRADO:  ${V['COB_ACTUAL']}M (+{V['COB_VAR_PCT']}% vs mes ant)")
    print(f"  FACTURADO:${V['FACT_ACTUAL']}M · tasa {V['TASA_ACTUAL']}%")
    print(f"  CHURN:    {V['CHURN_ABS_ACT']} SS reales · {V['CHURN_PCT_ACT']}% mensual")
    print(f"  ALTAS:    {V['ALTAS_V'][-1]} · recupero bloq {V['CHURN_TABLA'][-1]['pct_rec']}%")
    print(f"\n  → Ahora subí src/App.jsx a GitHub para que Vercel redeploy")
    print(f"{'='*55}\n")
