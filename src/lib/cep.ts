export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
};

export function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function isValidCpf(value: string) {
  const c = value.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

/** Busca endereço no ViaCEP. Retorna null se o CEP não existir. */
export async function lookupCep(rawCep: string): Promise<CepAddress | null> {
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const j = (await res.json()) as Record<string, string> & { erro?: boolean | string };
    if (!j || j.erro) return null;
    return {
      cep: maskCep(cep),
      street: j.logradouro ?? "",
      neighborhood: j.bairro ?? "",
      city: j.localidade ?? "",
      state: j.uf ?? "",
      complement: j.complemento ?? "",
    };
  } catch {
    return null;
  }
}

/** Lista ruas de uma cidade que contenham o termo (ViaCEP busca por logradouro). */
export async function searchStreets(uf: string, city: string, street: string) {
  if (uf.length !== 2 || city.trim().length < 3 || street.trim().length < 3) return [];
  try {
    const res = await fetch(
      `https://viacep.com.br/ws/${uf}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`,
    );
    const j = await res.json();
    if (!Array.isArray(j)) return [];
    return (j as Record<string, string>[]).slice(0, 25).map((x) => ({
      cep: maskCep(x.cep ?? ""),
      street: x.logradouro ?? "",
      neighborhood: x.bairro ?? "",
      city: x.localidade ?? "",
      state: x.uf ?? "",
    }));
  } catch {
    return [];
  }
}
