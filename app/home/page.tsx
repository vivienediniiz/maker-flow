import { permanentRedirect } from "next/navigation";

/**
 * A landing morava aqui antes de mudar pra raiz. A rota fica viva como
 * redirecionamento permanente pra não transformar em 404 qualquer link
 * pra /home que já tenha sido compartilhado, e pra que buscadores
 * transfiram o endereço pra `/` em vez de indexar as duas URLs.
 */
export default function HomePage() {
  permanentRedirect("/");
}
