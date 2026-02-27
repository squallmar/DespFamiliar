# Contribuindo para o DespFamiliar

Obrigado por considerar contribuir com o DespFamiliar! 🎉

## 🚀 Como Contribuir

### 1. Fork e Clone
```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/seu-usuario/DespFamiliar.git
cd DespFamiliar
```

### 2. Configure o Ambiente
```bash
npm install
cp .env.example .env
node init_db.js
npm run dev
```

### 3. Crie uma Branch
```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bugfix
```

### 4. Faça suas Mudanças
- Escreva código limpo e legível
- Siga o estilo do código existente
- Adicione comentários quando necessário
- Teste suas alterações localmente

### 5. Commit
```bash
# Use commits semânticos
git commit -m "feat: adiciona nova funcionalidade X"
git commit -m "fix: corrige bug Y"
git commit -m "docs: atualiza documentação Z"
```

**Tipos de commit:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação, espaçamento
- `refactor`: Refatoração de código
- `test`: Testes
- `chore`: Tarefas gerais

### 6. Push e Pull Request
```bash
git push origin feature/minha-feature
```

Abra um Pull Request no GitHub com:
- Título descritivo
- Descrição do que foi alterado
- Screenshots (se aplicável)
- Referência a issues relacionadas

## 📋 Guidelines

### Código
- Use TypeScript para tipo seguro
- Componentes em `src/components/`
- Páginas em `src/app/`
- APIs em `src/app/api/`
- Hooks customizados em `src/hooks/`
- Tipos em `src/types/`

### Estilo
- Tailwind CSS para estilização
- Componentes React funcionais
- Hooks para lógica de estado
- SWR para fetching de dados

### Testes
- Teste suas mudanças manualmente
- Verifique em diferentes tamanhos de tela
- Teste com dados reais e vazios

### Documentação
- Atualize o README se necessário
- Comente código complexo
- Documente novas APIs

## 🐛 Reportando Bugs

Use a seção [Issues](https://github.com/squallmar/DespFamiliar/issues) com:
- Título claro e descritivo
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots/logs
- Versão do navegador/SO

## 💡 Sugerindo Features

Abra uma issue com:
- Descrição clara da feature
- Problema que resolve
- Exemplos de uso
- Mockups (se possível)

## 📝 Código de Conduta

- Seja respeitoso e inclusivo
- Aceite feedback construtivo
- Foque no melhor para o projeto
- Ajude outros contribuidores

## ❓ Dúvidas?

- Abra uma [Discussion](https://github.com/squallmar/DespFamiliar/discussions)
- Ou comente em issues existentes

## 🎯 Áreas para Contribuir

- 🐛 Correção de bugs
- ✨ Novas funcionalidades
- 📚 Documentação
- 🎨 Melhorias de UI/UX
- 🌐 Traduções
- ♿ Acessibilidade
- 🚀 Performance
- 🧪 Testes

Obrigado por contribuir! 🙏
