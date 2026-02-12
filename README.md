# Freeman Streetwear - E-commerce Store

Loja online de streetwear construída com Next.js 14+, TypeScript, Supabase e MercadoPago.

## 🚀 Funcionalidades

### Frontend (Cliente)
- ✅ Listagem de produtos com filtros
- ✅ Página de detalhes do produto
- ✅ Carrinho de compras (localStorage)
- ✅ Checkout com informações de entrega
- ✅ Integração com MercadoPago para pagamento
- ✅ Página de confirmação de pedido
- ✅ Frete com taxa fixa configurável

### Backend & API
- ✅ API de checkout com validação de estoque
- ✅ Webhook do MercadoPago para processar pagamentos
- ✅ Redução automática de estoque após pagamento
- ✅ Envio de email de confirmação
- ✅ Banco de dados Supabase (PostgreSQL)
- ✅ Row Level Security (RLS) configurado

### Painel Admin
- ✅ Login com autenticação Supabase
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de produtos
- ✅ Gerenciamento de estoque
- ✅ Visualização e gerenciamento de pedidos
- ✅ Atualização de status de pedidos

## 🛠️ Tecnologias

- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Pagamento**: MercadoPago
- **Email**: Nodemailer (SMTP)
- **Deploy**: Vercel (recomendado)

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase
- Conta MercadoPago (opcional para testes)
- Servidor SMTP para envio de emails

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/leotezeira/freemanstreetwear.git
cd freemanstreetwear
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Preencha com suas credenciais:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# MercadoPago
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=sua_public_key
MERCADOPAGO_ACCESS_TOKEN=seu_access_token

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_app
EMAIL_FROM=noreply@freemanstreetwear.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Frete (em centavos)
FLAT_RATE_SHIPPING=1000
```

### 4. Configure o banco de dados Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com/)
2. Crie um novo projeto
3. Vá para SQL Editor
4. Execute o script `supabase/schema.sql` para criar as tabelas e políticas

### 5. Crie um usuário admin

Após executar o schema SQL:

1. Crie um usuário através do Supabase Auth (Dashboard → Authentication)
2. Copie o UUID do usuário criado
3. Execute no SQL Editor:

```sql
INSERT INTO admin_users (id, email, full_name, role, active)
VALUES ('UUID_DO_USUARIO', 'admin@example.com', 'Admin Name', 'admin', true);
```

### 6. Execute o projeto

```bash
npm run dev
```

Acesse:
- **Loja**: http://localhost:3000
- **Admin**: http://localhost:3000/admin

## 📦 Estrutura do Projeto

```
freemanstreetwear/
├── app/
│   ├── admin/              # Painel administrativo
│   │   ├── dashboard/      # Dashboard com estatísticas
│   │   ├── products/       # Gerenciamento de produtos
│   │   ├── orders/         # Visualização de pedidos
│   │   └── login/          # Login do admin
│   ├── api/                # API Routes
│   │   ├── checkout/       # Endpoint de checkout
│   │   └── webhook/        # Webhook MercadoPago
│   ├── cart/               # Página do carrinho
│   ├── checkout/           # Página de checkout
│   ├── confirmation/       # Confirmação de pedido
│   ├── products/[id]/      # Detalhes do produto
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Home page
│   └── globals.css         # Estilos globais
├── components/
│   ├── cart/               # Componentes do carrinho
│   │   └── CartProvider.tsx
│   └── ui/                 # Componentes de UI
│       ├── Navbar.tsx
│       └── ProductCard.tsx
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   └── utils.ts            # Funções utilitárias
├── types/
│   └── index.ts            # TypeScript types
├── supabase/
│   └── schema.sql          # Schema do banco de dados
└── public/                 # Arquivos estáticos
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **products**: Produtos da loja
- **orders**: Pedidos realizados
- **order_items**: Itens de cada pedido
- **customers**: Informações dos clientes
- **admin_users**: Usuários administradores

Ver detalhes completos em `supabase/schema.sql`.

## 🔐 Segurança

- Row Level Security (RLS) ativado em todas as tabelas
- Autenticação obrigatória para painel admin
- Validação de estoque antes de criar pedidos
- Webhook do MercadoPago para confirmar pagamentos
- Service Role Key usado apenas no servidor

## 🚀 Deploy na Vercel

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no Vercel Dashboard
3. Configure a URL do webhook no MercadoPago:
   ```
   https://seu-dominio.vercel.app/api/webhook
   ```
4. Deploy!

## 📱 Como Testar

### 1. Adicionar Produtos (Admin)
1. Acesse `/admin/login`
2. Faça login com suas credenciais
3. Vá para "Produtos" → "Novo Produto"
4. Preencha os dados e salve

### 2. Fazer uma Compra (Cliente)
1. Acesse a página inicial
2. Clique em um produto
3. Adicione ao carrinho
4. Finalize a compra
5. Preencha os dados de entrega
6. Pague com MercadoPago

### 3. Gerenciar Pedidos (Admin)
1. Acesse `/admin/orders`
2. Visualize os pedidos
3. Atualize o status conforme necessário

## 🔄 Webhook do MercadoPago

Configure a URL do webhook no painel do MercadoPago:

```
https://seu-dominio.com/api/webhook
```

O webhook processa:
- Confirmação de pagamento
- Redução de estoque
- Envio de email de confirmação
- Atualização de status do pedido

## 📧 Configuração de Email

Para Gmail:
1. Ative a verificação em duas etapas
2. Crie uma senha de aplicativo
3. Use essa senha no `EMAIL_PASSWORD`

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 📄 Licença

ISC

## 👤 Autor

Leo Tezeira

---

**Freeman Streetwear** - Streetwear autêntico e de qualidade 🔥
