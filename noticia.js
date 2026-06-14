const noticia = JSON.parse(localStorage.getItem("news"));
const post = document.getElementById("post");

if (!noticia) {
    post.innerHTML = `<p style="text-align:center;padding:40px;">Notícia não encontrada. <a href="index.html" style="color:#00ff88">Voltar</a></p>`;
} else {
    const paginaId = "noticia_" + btoa(noticia.url).slice(0, 20);
    document.title = noticia.title + " — Gamer Hub";

    post.innerHTML = `
        <div class="news-card">
            <img src="${noticia.urlToImage || PLACEHOLDER}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            ${badgeTag(noticia)}
            <h1>${noticia.title}</h1>
            <p class="descricao">${noticia.description || ""}</p>
            <div id="conteudoCompleto"><p style="color:#888;text-align:center;padding:20px;">Carregando conteúdo...</p></div>
            <p class="fonte">
                Fonte: ${noticia.source?.name || "desconhecida"}
                ${noticia.author ? " — " + noticia.author : ""}
            </p>
        </div>
    `;

    carregarConteudo(noticia, paginaId);
}

async function carregarConteudo(noticia, paginaId) {
    const div = document.getElementById("conteudoCompleto");

    try {
        const res = await fetch(`/api/noticia?url=${encodeURIComponent(noticia.url)}`);
        const dados = await res.json();

        if (dados.content && dados.content.length > 0) {
            renderSecoes(div, dados.content);
        } else {
            renderFallback(div, noticia);
        }
    } catch {
        renderFallback(div, noticia);
    }

    renderComentarios(paginaId);
}

function renderSecoes(div, paragrafos) {
    // Divide os parágrafos em 3 seções
    const total = paragrafos.length;
    const t1 = Math.max(1, Math.ceil(total * 0.35));
    const t2 = Math.max(t1 + 1, Math.ceil(total * 0.7));

    const p1 = paragrafos.slice(0, t1);
    const p2 = paragrafos.slice(t1, t2);
    const p3 = paragrafos.slice(t2);

    let html = `
        <div class="secao secao-aconteceu">
            <h2>
                <svg class="icon icon-sm" viewBox="0 0 24 24" stroke="#00ff88"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                O que aconteceu
            </h2>
            ${p1.map(p => `<p>${p}</p>`).join("")}
        </div>
    `;

    if (p2.length > 0) {
        html += `
            <div class="secao secao-contexto">
                <h2>
                    <svg class="icon icon-sm" viewBox="0 0 24 24" stroke="#00c3ff"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    Por que aconteceu
                </h2>
                ${p2.map(p => `<p>${p}</p>`).join("")}
            </div>
        `;
    }

    if (p3.length > 0) {
        html += `
            <div class="secao secao-detalhes">
                <h2>
                    <svg class="icon icon-sm" viewBox="0 0 24 24" stroke="#b14cff"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Mais detalhes
                </h2>
                ${p3.map(p => `<p>${p}</p>`).join("")}
            </div>
        `;
    }

    div.innerHTML = html;
}

function renderFallback(div, noticia) {
    const trecho = noticia.content ? noticia.content.split("[")[0] : "Conteúdo não disponível.";
    div.innerHTML = `
        <div class="secao-fallback">
            <p>${trecho}</p>
            <p class="aviso">
                Não foi possível carregar o conteúdo completo.
                <a href="${noticia.url}" target="_blank">Leia na fonte original</a>.
            </p>
        </div>
    `;
}

// 💬 COMENTÁRIOS
function renderComentarios(paginaId) {
    const container = document.querySelector(".news-page");

    const secao = document.createElement("div");
    secao.className = "comentarios-section";
    secao.innerHTML = `
        <h2>
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Comentários da comunidade
        </h2>

        <div class="form-comentario">
            <input id="com-nome" type="text" placeholder="Seu apelido (ex: GamerPro123)" maxlength="40">
            <textarea id="com-texto" placeholder="Deixe sua opinião sobre essa notícia..." maxlength="500"></textarea>
            <div class="form-footer">
                <span class="char-count"><span id="char-atual">0</span>/500</span>
                <button onclick="enviarComentario('${paginaId}')">Publicar comentário</button>
            </div>
            <div id="form-erro" class="form-erro" style="display:none"></div>
        </div>

        <div class="lista-comentarios" id="lista-comentarios">
            <p style="text-align:center;color:#666;font-size:14px;">Carregando comentários...</p>
        </div>
    `;

    container.appendChild(secao);

    // contador de caracteres
    document.getElementById("com-texto").addEventListener("input", function() {
        document.getElementById("char-atual").textContent = this.value.length;
    });

    carregarComentarios(paginaId);
}

async function carregarComentarios(paginaId) {
    const lista = document.getElementById("lista-comentarios");
    try {
        const res = await fetch(`/api/comentarios?pagina=${paginaId}`);
        const comentarios = await res.json();

        if (comentarios.length === 0) {
            lista.innerHTML = `<p class="sem-comentarios">Seja o primeiro a comentar! 💬</p>`;
            return;
        }

        lista.innerHTML = comentarios.map(c => `
            <div class="comentario-card">
                <div class="com-header">
                    <span class="com-nome">${escapeHtml(c.nome)}</span>
                    <span class="com-data">${c.data}</span>
                </div>
                <p class="com-texto">${escapeHtml(c.texto)}</p>
            </div>
        `).join("");
    } catch {
        lista.innerHTML = `<p class="sem-comentarios">Erro ao carregar comentários.</p>`;
    }
}

async function enviarComentario(paginaId) {
    const nome = document.getElementById("com-nome").value.trim();
    const texto = document.getElementById("com-texto").value.trim();
    const erroDiv = document.getElementById("form-erro");

    erroDiv.style.display = "none";

    if (!nome || !texto) {
        erroDiv.textContent = "Preencha seu apelido e o comentário.";
        erroDiv.style.display = "block";
        return;
    }

    try {
        const res = await fetch("/api/comentarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pagina: paginaId, nome, texto })
        });

        const dados = await res.json();

        if (!res.ok) {
            erroDiv.textContent = dados.erro || "Erro ao publicar.";
            erroDiv.style.display = "block";
            return;
        }

        document.getElementById("com-nome").value = "";
        document.getElementById("com-texto").value = "";
        document.getElementById("char-atual").textContent = "0";
        carregarComentarios(paginaId);

    } catch {
        erroDiv.textContent = "Erro de conexão.";
        erroDiv.style.display = "block";
    }
}

function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
