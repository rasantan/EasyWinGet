# Teste do instalador (.cmd) e script PowerShell (.ps1)

Validação automatizada (CI/local) e checklist manual no Windows.

## Validação automatizada

```bash
npm run validate:ps1
```

O script `scripts/validate-ps1-generator.mjs` chama `generateScript` com pacotes mock (`Git.Git`, `7zip.7zip`) nos locales `pt-BR` e `en` e verifica:

- `$EasyWinGetManifest` e JSON do manifesto com os IDs corretos
- `Unblock-File` (desbloqueio MOTW)
- Comando `winget install` via `Invoke-WingetWithProgress` (streaming com métricas)
- GUI `System.Windows.Forms` com botão **Fechar** pós-conclusão, `$metricsLabel` e tratamento de pacotes já instalados
- Strings de interface por locale
- Launcher `.cmd` com marcadores dinâmicos e extração por índice (evita falso positivo no comando embutido)

Extração do PS1 embutido (smoke test local):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-extract.ps1
```

(Ajuste `$env:EWG_SELF` no script se o `.cmd` não estiver em `Downloads`.)

## Teste manual no Windows (obrigatório antes de release)

Requer Windows 10/11 com **App Installer** (WinGet) instalado.

### 1. Gerar o instalador

1. Abra o EasyWinGet (`npm run dev` ou deploy).
2. Adicione ao carrinho **Git** (`Git.Git`) e **7-Zip** (`7zip.7zip`).
3. Vá ao carrinho e clique em **Baixar instalador (.cmd)**.
4. Salve `easywinget-install.cmd`.

### 2. Executar (fluxo recomendado)

1. Dê **dois cliques** em `easywinget-install.cmd` na pasta Downloads.
2. Se aparecer o UAC, clique em **Sim** (permissão de administrador).
3. Não é necessário abrir PowerShell nem alterar `ExecutionPolicy`.

### 3. Verificar GUI e instalação

- [ ] Janela WinForms abre com título **EasyWinGet - Instalador** (pt-BR) ou **EasyWinGet - Installer** (en)
- [ ] Lista mostra Git e 7-Zip com IDs `Git.Git` e `7zip.7zip`
- [ ] **Instalar todos** → confirmação → barra de progresso avança; label de métricas mostra tamanho/velocidade ou tempo decorrido
- [ ] Pacote já instalado aparece como **Já instalado** / **Already installed** (não como falha)
- [ ] Pacotes novos instalam com sucesso (ou falha explícita com log)
- [ ] Ao concluir: botão **Fechar** / **Close** (Enter também fecha); resumo `X concluído(s), Y falha(s)`
- [ ] Acentos pt-BR legíveis (Segoe UI); sem caracteres corrompidos (█, Γ) na lista
- [ ] **Ver log** mostra saída limpa das instalações

### 4. Política de execução (regressão)

Em PowerShell com política restritiva (`Restricted`):

- [ ] `.\easywinget-install.ps1` **falha** com erro de script não assinado (esperado se rodar .ps1 direto)
- [ ] `.\easywinget-install.cmd` **funciona** sem pedir `Set-ExecutionPolicy`

### 5. Auditar manifesto

No modo Avançado, copie ou visualize o `.ps1` embutido e confira `$EasyWinGetManifest`:

- [ ] `locale` corresponde ao idioma da UI
- [ ] `packages` contém exatamente os itens do carrinho
- [ ] Nenhum pacote extra além da seleção

### 6. WinGet ausente (opcional)

Em VM ou perfil sem WinGet: o script deve exibir MessageBox de aviso e encerrar com código 1.
