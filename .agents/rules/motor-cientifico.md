---
trigger: glob
globs: "engine/**, functions/src/**"
description: "Regras para alterar o motor de cálculo (engine) e as Cloud Functions que o chamam: fontes, testes e invariantes de segurança."
---

# Motor científico — regras de alteração

1. Toda constante numérica nova vai para `engine/src/config.ts` como `{ value, sources }`. Se não houver fonte, use `PREMISSA_PROJETO` e acrescente a premissa na tabela da seção 7 de `docs/02-BASE-CIENTIFICA.md`.
2. Fonte nova → adicione em `engine/src/references.ts` (com DOI ou URL) **e** na seção 8 de `docs/02-BASE-CIENTIFICA.md`.
3. Funções do motor são puras: sem I/O, sem `Date.now()` escondido (receba datas por parâmetro), sem acesso a Firebase.
4. Toda função pública devolve os números junto com `sources`. Nunca devolva um número de saúde "solto".
5. Invariantes que os testes protegem e que nenhuma mudança pode quebrar:
   - calorias em déficit nunca abaixo do piso (1.200 kcal mulheres / 1.500 kcal homens);
   - déficit nunca acima de 1.000 kcal nem de 25 % do gasto;
   - ritmo de emagrecimento planejado nunca acima de 1 % do peso por semana;
   - meta com IMC-alvo < 18,5 ou % de gordura abaixo do limite → `unsafe`;
   - todos os grandes grupos musculares ≥ 2x por semana;
   - check-in não ajusta com menos de 14 dias de dados e nunca mais que ±250 kcal;
   - sintomas de alerta pausam o déficit.
6. Depois de qualquer alteração: `cd engine && npm test` e, se mudou tipos, `npx tsc --noEmit`. Mostre a saída.
7. Nas Cloud Functions: valide a entrada com zod, chame o motor, grave o resultado. Não reimplemente fórmula nenhuma.
