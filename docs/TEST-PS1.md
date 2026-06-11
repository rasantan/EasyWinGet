# Teste do script PowerShell (.ps1)

Validação automatizada (CI/local) e checklist manual no Windows.

## Validação automatizada

```bash
npm run validate:ps1
```

O script `scripts/validate-ps1-generator.mjs` chama `generateScript` com pacotes mock (`Git.Git`, `7zip.7zip`) nos locales `pt-BR` e `en` e verifica:

- `$EasyWinGetManifest` e JSON do manifesto com os IDs corretos
- `Unblock-File` (desbloqueio MOTW)
- Comando `winget install` via `$wingetArgs`
- GUI `System.Windows.Forms`
- Strings de interface por locale
- Hash SHA-256 real no cabeçalho (não placeholder)

## Teste manual no Windows (obrigatório antes de release)

Requer Windows 10/11 com **App Installer** (WinGet) instalado.

### 1. Gerar o script

1. Abra o EasyWinGet (`npm run dev` ou deploy).
2. Adicione ao carrinho **Git** (`Git.Git`) e **7-Zip** (`7zip.7zip`).
3. Vá ao carrinho e clique em **Baixar script** / **Download script**.
4. Salve `easywinget-install.ps1`.

### 2. Executar

1. Clique com o botão direito no `.ps1` → **Executar com PowerShell**  
   (ou abra PowerShell e rode: `powershell -ExecutionPolicy Bypass -File .\easywinget-install.ps1`)
2. Se o Windows bloquear por MOTW, confirme que o script contém `Unblock-File` ou desbloqueie manualmente:  
   `Unblock-File -Path .\easywinget-install.ps1`

### 3. Verificar GUI e instalação

- [ ] Janela WinForms abre com título **EasyWinGet — Instalador** (pt-BR) ou **EasyWinGet — Installer** (en)
- [ ] Lista mostra Git e 7-Zip com IDs `Git.Git` e `7zip.7zip`
- [ ] **Instalar todos** → confirmação → barra de progresso avança
- [ ] Pacotes instalam com sucesso (ou falha explícita com log)
- [ ] **Ver log** mostra saída das instalações

### 4. Auditar manifesto

No topo do `.ps1`, confira o bloco JSON em `$EasyWinGetManifest`:

- [ ] `locale` corresponde ao idioma da UI
- [ ] `packages` contém exatamente os itens do carrinho
- [ ] Nenhum pacote extra além da seleção

### 5. WinGet ausente (opcional)

Em VM ou perfil sem WinGet: o script deve exibir MessageBox de aviso e encerrar com código 1.
