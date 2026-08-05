# Lista Mestre de Materiais e Custos — Cursos de Elétrica

Aplicação web responsiva em HTML5, CSS e JavaScript, integrada ao Firebase Authentication e Cloud Firestore. Inclui modo demonstração local, 12 matrizes de cursos, catálogo inicial de materiais, controle de estoque, cotações com fonte e validade, cálculo para turma padrão de 35 alunos e geração de PDF pelo navegador.

## 1. Configurar o Firebase

1. Crie um projeto no Firebase Console.
2. Adicione um aplicativo Web.
3. Ative **Authentication > E-mail/senha**.
4. Crie o **Cloud Firestore**.
5. Opcionalmente, ative o **Storage**.
6. Copie a configuração Web e cole em `firebase-config.js`.
7. Publique `firestore.rules` e `storage.rules`.
8. Crie o primeiro usuário no Authentication.
9. No Firestore, crie manualmente o documento `users/UID_DO_USUARIO`:

```json
{
  "name": "Administrador",
  "email": "seu-email@dominio.com",
  "role": "admin",
  "active": true
}
```

Perfis aceitos: `admin`, `coordenacao`, `almoxarifado`.

## 2. Executar localmente

Por usar módulos ES, não abra diretamente com duplo clique. Use um servidor local:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## 3. Publicar no Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

Também pode publicar os mesmos arquivos no Vercel ou GitHub Pages.

## 4. Base inicial

Após entrar, clique em **Carregar base inicial**. A base contém os cursos recebidos e materiais coerentes com seus ambientes pedagógicos. As quantidades são parâmetros operacionais iniciais e devem ser validadas pelo docente/coordenação antes da compra.

## 5. Política de preços

As cotações guardam fornecedor, embalagem, preço, valor unitário, link e data. O sistema marca cotações vencidas após 30 dias. Valores iniciais pesquisados em 05/08/2026 são apenas os que tinham preço público verificável; os demais ficam sem preço e não são inventados.

## 6. PDF

Abra **Relatórios**, escolha o curso, informe alunos/grupos/reserva e clique em **Calcular relatório**. Depois use **Gerar PDF** e selecione “Salvar como PDF” na caixa de impressão do navegador.
