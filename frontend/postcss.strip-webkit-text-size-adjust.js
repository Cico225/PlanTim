/**
 * Tailwind Preflight emits `-webkit-text-size-adjust: 100%` (often on `html, :host`).
 * Firefox u konzoli prijavljuje "Error in parsing value ... Declaration dropped" za tu prefiksnu
 * deklaraciju; funkcionalnost aplikacije nije ugrožena, ali konzola zbunjuje.
 * Nakon autoprefixera uklanjamo samo tu deklaraciju — `text-size-adjust` ostaje gdje postoji (Tailwind 3.4+ / drugi izlazi).
 */
export default function stripWebkitTextSizeAdjust() {
  return {
    postcssPlugin: 'strip-webkit-text-size-adjust',
    OnceExit(root) {
      const remove = [];
      root.walkDecls((decl) => {
        if (decl.prop === '-webkit-text-size-adjust') {
          remove.push(decl);
        }
      });
      remove.forEach((d) => d.remove());
    },
  };
}

stripWebkitTextSizeAdjust.postcss = true;
