/**
 * Documentos legais aceitos no cadastro.
 *
 * As datas ficam aqui, e não escritas à mão dentro de cada página, porque
 * `LEGAL_VERSION` é o que fica gravado em `profiles.terms_version` — ou seja,
 * é o registro de a QUAL texto o usuário disse sim. Se a data da página e a
 * versão gravada divergirem, o aceite guardado passa a apontar pro documento
 * errado, que é justamente o que ele deveria provar.
 *
 * Ao publicar uma nova versão de qualquer um dos dois documentos: atualizar a
 * data correspondente E `LEGAL_VERSION`.
 */

/** Mostrada no topo de /terms. */
export const TERMS_UPDATED_AT = "19 de agosto de 2026";

/** Mostrada no topo de /privacy-policy. */
export const PRIVACY_UPDATED_AT = "16 de agosto de 2026";

/** A mais recente entre as duas, em ISO pra ordenar e comparar. */
export const LEGAL_VERSION = "2026-08-19";
