# TdA26-ISŠTE_To_Si_Pište

## Tým
| Jméno a Příjmení        | Role        |
| ----------------------- |-------------|
| Ing. Bohuslava Vlčková  | Mentor      |
| Matěj Dobiáš            | CEO         |
| Dan Hýský               | Zástupce CEO|

## Použité technologie

### Backend
![JavaScript](https://img.shields.io/badge/JavaScript-000000?style=for-the-badge&logo=javascript)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy-339933?style=for-the-badge&logo=caddy&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

### Frontend
![JavaScript](https://img.shields.io/badge/JavaScript-000000?style=for-the-badge&logo=javascript)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)


  
## Popis projektu

Tento projekt byl vytvořen v rámci účasti v soutěži Tour De App a studia oboru Informační technologie na střední škole.  
Cílem je ukázat schopnost navrhnout, realizovat a zdokumentovat software formou týmové spolupráce.

## Účel aplikace

Aplikace slouží jako ukázka školního projektu, který může být dále rozšiřován o nové funkce podle zadání nebo potřeb zadavatele.  
README soubor zajišťuje základní představu o týmu a projektu pro vyučující nebo hodnotitele.

## Jak spustit aplikaci

### Požadavky
- Node.js (verze 16+)
- npm
- Docker
- Git

### Instalace a spuštění

#### 1. Klonování repozitáře
```bash
git clone https://github.com/ISSTE-TSP/TdA26-ISSTE_To_Si_Piste.git
cd TdA26-ISSTE_To_Si_Piste
```

#### 2. Instalace závislostí

**Backend (Server):**
```bash
cd apps/server
npm install
```

**Frontend (Web):**
```bash
cd apps/web
npm install
```

#### 3. Nastavení databáze

**Varianta A: Docker (doporučeno)**
```bash
cd apps/server
npm run db
```

Tento příkaz spustí MySQL databázi v Dockeru s následujícím nastavením:
- Database: `tda_app`
- Root heslo: `password`
- Port: `3306`

**Varianta B: Lokální MySQL**
- Vytvořte databázi `tda_app`
- Nastavte připojení v `.env` souboru (viz dále)

#### 4. Konfigurační soubor

V adresáři `/apps/server` vytvořte soubor `.env`:
```
DATABASE_URL=mysql://root:password@localhost:3306/tda_app
```

#### 5. Spuštění aplikace

**Backend (Server):**
```bash
cd apps/server
npm run dev
```
Server poběží na `http://localhost:3001`

**Frontend (Web) - v novém terminálu:**
```bash
cd apps/web
npm run dev
```

### Povolené porty
- Frontend (Web): `3001`
- Backend (Server): `3001`
- MySQL: `3306`
- Caddy (Reverse Proxy): `80`

