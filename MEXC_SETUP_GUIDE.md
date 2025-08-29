# 🔑 MEXC API Setup Guide

## Configuração Completa das Credenciais MEXC para Testes Reais

### 📋 Pré-requisitos

1. **Conta MEXC verificada** com KYC completo
2. **Saldo mínimo** de 10 USDT para testes
3. **Autenticação 2FA** habilitada
4. **Acesso à internet** estável

---

## 🚀 Passo 1: Criar API Keys na MEXC

### 1.1 Acessar o Painel de API

1. Faça login em [MEXC.com](https://www.mexc.com)
2. Vá para **Perfil** → **API Management**
3. Ou acesse diretamente: https://www.mexc.com/user/api

### 1.2 Criar Nova API Key

1. Clique em **"Create API"**
2. Preencha os campos:
   - **Label**: `AGD Trading Bot`
   - **Passphrase**: Crie uma senha forte (anote!)

### 1.3 Configurar Permissões

✅ **Permissões Necessárias:**
- **Spot Trading**: ✅ HABILITADO
- **Read**: ✅ HABILITADO

❌ **Permissões NÃO Recomendadas:**
- **Futures Trading**: ❌ DESABILITADO
- **Withdraw**: ❌ DESABILITADO (segurança)

### 1.4 Configurar Restrições de IP (Opcional)

Para maior segurança, adicione seu IP:
\`\`\`bash
# Descobrir seu IP público
curl ifconfig.me
\`\`\`

### 1.5 Completar Verificação 2FA

1. Digite o código do seu Google Authenticator
2. Confirme por email se solicitado
3. **IMPORTANTE**: Copie e salve com segurança:
   - **API Key**: `mx0vGL...`
   - **Secret Key**: `abc123...`
   - **Passphrase**: `sua_senha`

---

## 🔧 Passo 2: Configurar no Sistema

### 2.1 Acessar o Dashboard

1. Faça login no AGD Trading Dashboard
2. Vá para **Account Management**
3. Clique em **"Add MEXC Account"**

### 2.2 Seguir o Wizard de Setup

O sistema irá guiá-lo através de:

1. **Instruções** detalhadas
2. **Inserção** das credenciais
3. **Validação** automática
4. **Confirmação** final

### 2.3 Validação Automática

O sistema testará:
- ✅ Conectividade com MEXC
- ✅ Validade das credenciais
- ✅ Permissões necessárias
- ✅ Acesso ao par AGD/USDT
- ✅ Saldos disponíveis

---

## 🧪 Passo 3: Testes de Funcionalidade

### 3.1 Testes Básicos

\`\`\`bash
# 1. Teste de conectividade
curl -X GET "https://api.mexc.com/api/v3/ping"

# 2. Teste de horário do servidor
curl -X GET "https://api.mexc.com/api/v3/time"
\`\`\`

### 3.2 Testes com Credenciais

O sistema automaticamente testará:

1. **Account Info**: Informações da conta
2. **Order Book**: Acesso ao livro de ofertas
3. **Balance Check**: Verificação de saldos
4. **Permissions**: Validação de permissões

### 3.3 Teste de Ordem (Simulado)

O sistema validará parâmetros sem executar:
- Quantidade mínima: 1 AGD
- Valor mínimo: 5 USDT
- Formato de preço correto

---

## 🔒 Passo 4: Configurações de Segurança

### 4.1 Configurar VPN

1. Selecione localização: **Singapore** (recomendado)
2. Habilite rotação automática
3. Configure intervalo: **30 minutos**

### 4.2 Configurar Anti-Detecção

- ✅ **Random Delays**: Habilitado
- ✅ **User Agent Rotation**: Habilitado
- ✅ **Request Fingerprinting**: Habilitado
- ⚙️ **Max Orders/Hour**: 50

### 4.3 Wash Trading Protection

- ✅ **Proteção Ativa**: Sempre habilitada
- 🔍 **Monitoramento**: Contínuo
- 📊 **Logs**: Auditoria completa

---

## 📊 Passo 5: Monitoramento e Logs

### 5.1 Verificar Status

\`\`\`bash
# Verificar status do sistema
npm run status

# Ver logs em tempo real
npm run logs
\`\`\`

### 5.2 Métricas Importantes

- **Latência**: < 100ms para MEXC
- **Taxa de Sucesso**: > 99%
- **Uptime**: 24/7
- **Rate Limit**: Respeitado

### 5.3 Alertas Configurados

- 🚨 **Falha de Conexão**: Notificação imediata
- ⚠️ **Rate Limit**: Aviso preventivo
- 📉 **Saldo Baixo**: Alerta de saldo
- 🔒 **Erro de Permissão**: Notificação de segurança

---

## 🛠️ Troubleshooting

### Problemas Comuns

#### ❌ "Invalid API Key"
**Solução:**
1. Verifique se copiou a API key completa
2. Confirme que não há espaços extras
3. Regenere a API key se necessário

#### ❌ "Invalid Signature"
**Solução:**
1. Verifique o Secret Key
2. Confirme sincronização de horário
3. Teste com timestamp atual

#### ❌ "IP not allowed"
**Solução:**
1. Adicione seu IP na whitelist MEXC
2. Ou remova restrições de IP
3. Verifique se está usando VPN

#### ❌ "Insufficient permissions"
**Solução:**
1. Habilite "Spot Trading" na MEXC
2. Confirme permissões no painel
3. Regenere API key com permissões corretas

### Logs de Debug

\`\`\`bash
# Ver logs detalhados
tail -f logs/mexc-api.log

# Filtrar erros
grep "ERROR" logs/mexc-api.log

# Monitorar requests
grep "MEXC API Request" logs/mexc-api.log
\`\`\`

---

## 📈 Passo 6: Otimização para Produção

### 6.1 Configurações Recomendadas

\`\`\`env
# Configurações otimizadas
MEXC_REQUEST_TIMEOUT=15000
MEXC_RETRY_ATTEMPTS=3
MEXC_RATE_LIMIT_BUFFER=0.8
MEXC_CONNECTION_POOL_SIZE=10
\`\`\`

### 6.2 Monitoramento Avançado

- 📊 **Grafana Dashboard**: Métricas em tempo real
- 🔔 **Alertas Slack**: Notificações importantes
- 📝 **Logs Estruturados**: JSON para análise
- 🔍 **Health Checks**: Verificações automáticas

### 6.3 Backup e Recuperação

- 💾 **Backup de Configurações**: Diário
- 🔄 **Failover Automático**: Para múltiplas contas
- 📋 **Plano de Recuperação**: Documentado
- 🧪 **Testes de Disaster Recovery**: Mensais

---

## ✅ Checklist Final

### Antes de Ir para Produção:

- [ ] API Keys criadas e testadas
- [ ] Permissões corretas configuradas
- [ ] Saldos suficientes para trading
- [ ] VPN configurada e funcionando
- [ ] Anti-detecção habilitado
- [ ] Logs e monitoramento ativos
- [ ] Backup de configurações feito
- [ ] Testes de conectividade OK
- [ ] Rate limits respeitados
- [ ] Wash trading protection ativa

### Contatos de Suporte:

- 📧 **Email**: suporte@agdtrading.com
- 💬 **Telegram**: @AGDTradingSupport
- 🎫 **Tickets**: https://support.agdtrading.com
- 📞 **Emergência**: +55 11 9999-9999

---

## 🎯 Próximos Passos

1. **Configurar WebSocket** para dados em tempo real
2. **Implementar algoritmos** de trading avançados
3. **Adicionar mais exchanges** (Binance, OKX)
4. **Criar dashboard** de analytics
5. **Implementar backtesting** de estratégias

**🚀 Seu sistema AGD Trading está pronto para operar!**
