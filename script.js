// --- FUNÇÕES DE UTILIDADE (Intervalo e Linha) ---
function removerIntervalo(botao) {
    const pair = botao.closest(".intervalo-pair");
    pair.remove();
    calcularHoras();
}

function adicionarIntervalo(botao) {
    const container = botao.closest(".intervalo-container");
    const currentPair = botao.closest(".intervalo-pair");

    const novoIntervalo = document.createElement("div");
    novoIntervalo.className = "intervalo-pair";

    novoIntervalo.innerHTML = `
    <input type="time" class="intervalo-inicio">
    <input type="time" class="intervalo-fim">
    <button class="add-intervalo" onclick="adicionarIntervalo(this)" title="Adicionar intervalo">
       <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M9 7h6v2H9v6H7V9H1V7h6V1h2v6z" fill="currentColor"/></svg>
    </button>
    <button class="remover-intervalo" onclick="removerIntervalo(this)" title="Remover intervalo">
        <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4zm-5 2h2v8H9v-8zm6 0h-2v8h2v-8z" fill="currentColor"/> </svg>
    </button>
`;

    novoIntervalo.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calcularHoras);
    });

    container.insertBefore(novoIntervalo, currentPair.nextSibling);
    calcularHoras();
}

function criarElementoLinha() {
    const linha = document.createElement('tr');
    linha.innerHTML = `
        <td data-label="Data">
            <div class="data-container">
                <input type="date" class="data">
                <button class="add-linha-abaixo" onclick="adicionarLinhaAbaixo(this)" title="Adicionar linha abaixo com a mesma data">
                    <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M9 7h6v2H9v6H7V9H1V7h6V1h2v6z" fill="currentColor"/></svg>
                </button>
            </div>
        </td>
        <td data-label="Atividade"><input type="text" class="atividade"></td>
        <td data-label="Início"><input type="time" class="entrada"></td>
        <td data-label="Fim"><input type="time" class="saida"></td>
        <td data-label="Intervalos">
        <div class="intervalo-container">
            <div class="intervalo-pair">
            <input type="time" class="intervalo-inicio">
            <input type="time" class="intervalo-fim">
            <button class="add-intervalo" onclick="adicionarIntervalo(this)" title="Adicionar intervalo">
                <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M9 7h6v2H9v6H7V9H1V7h6V1h2v6z" fill="currentColor"/></svg>
            </button>
            </div>
        </div>
        </td>
        <td data-label="Hora-aula?"><input type="checkbox" class="hora-aula"></td>
        <td data-label="Total Dia" class="horas-dia">00:00</td>
        <td data-label="Saldo Dia" class="saldo-dia">00:00</td>
        <td data-label="Ações">
            <button class="remover-intervalo" onclick="removerLinha(this)" title="Remover Linha">
                <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4zm-5 2h2v8H9v-8zm6 0h-2v8h2v-8z" fill="currentColor"/> </svg>
            </button>
        </td>
    `;
    return linha;
}

function adicionarLinha() {
    const tbody = document.getElementById("corpo-tabela");
    const novaLinhaElement = criarElementoLinha();
    tbody.appendChild(novaLinhaElement);

    novaLinhaElement.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calcularHoras);
    });
    return novaLinhaElement;
}

function adicionarLinhaAbaixo(botao) {
    const linhaAtual = botao.closest("tr");
    const dataAtualInput = linhaAtual.querySelector(".data");
    const dataParaCopiar = dataAtualInput
        ? dataAtualInput.value
        : "";

    const novaLinhaElement = criarElementoLinha();

    const dataNovaInput = novaLinhaElement.querySelector(".data");
    if (dataNovaInput) {
        dataNovaInput.value = dataParaCopiar;
    }

    linhaAtual.insertAdjacentElement("afterend", novaLinhaElement);

    novaLinhaElement.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", calcularHoras);
    });
}

function removerLinha(botao) {
    const linha = botao.closest("tr");
    linha.remove();
    calcularHoras();
}

// --- FUNÇÃO (Cálculo de Adicional Noturno) ---
function calcularMinutosComAdicional(startMin, endMin) {
    const NIGHT_BONUS_FACTOR = 60 / 52.5;
    const NIGHT_START = 1320; // 22:00
    const NIGHT_END = 300; // 05:00
    const DAY_END = 1440; // 24:00

    let totalCompensatedMinutes = 0;

    let spans = [];
    if (endMin < startMin) {
        spans.push({ start: startMin, end: DAY_END });
        spans.push({ start: 0, end: endMin });
    } else {
        spans.push({ start: startMin, end: endMin });
    }

    for (const span of spans) {
        let normalMinutes = 0;
        let nightlyMinutes = 0;

        for (let min = span.start; min < span.end; min++) {
            if (min >= NIGHT_START || min < NIGHT_END) {
                nightlyMinutes++;
            } else {
                normalMinutes++;
            }
        }
        totalCompensatedMinutes +=
            normalMinutes + nightlyMinutes * NIGHT_BONUS_FACTOR;
    }

    return totalCompensatedMinutes;
}

// --- FUNÇÃO DE CÁLCULO PRINCIPAL (COM ESCALA SEMANAL DETALHADA, TOLERÂNCIA E SALDO MENSAL) ---
function calcularHoras() {
    const linhas = document.querySelectorAll('#corpo-tabela tr');
    let totalMinutosMes = 0;
    const totaisPorData = {}; // Guarda { total: xxx, esperado: yyy }
    const diasTrabalhados = new Set();
    const HORAS_DIA_PADRAO_MIN = 8 * 60;
    const TOLERANCIA_MINUTOS = 5;
    const DAY_END = 1440;
    const HORA_AULA_FACTOR = 60 / 50;

    // --- Lê a escala SEMANAL DETALHADA e calcula duração esperada POR DIA DA SEMANA ---
    const duracaoEsperadaPorDiaSemana = {}; // 0=Dom, 1=Seg, ..., 6=Sab
    const dias = ['seg', 'ter', 'qua', 'qui', 'sex'];
    const diasIdx = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5 };

    for (const dia of dias) {
         let duracaoTotalDia = 0;

         for (let turno = 1; turno <= 2; turno++) {
             const e = document.getElementById(`escala-entrada${turno}-${dia}`).value;
             const s = document.getElementById(`escala-saida${turno}-${dia}`).value;
             const intIni = document.getElementById(`escala-int-inicio${turno}-${dia}`).value;
             const intFim = document.getElementById(`escala-int-fim${turno}-${dia}`).value;
             const hAula = document.getElementById(`escala-hora-aula${turno}-${dia}`).checked;

             let duracaoBrutaTurno = 0;
             let duracaoIntervaloTurno = 0;

             if (e && s) {
                 const eMin = converterParaMinutos(e);
                 const sMin = converterParaMinutos(s);
                 duracaoBrutaTurno = (sMin < eMin) ? (DAY_END - eMin) + sMin : sMin - eMin;
             }

             if (intIni && intFim) {
                 const intIniMin = converterParaMinutos(intIni);
                 const intFimMin = converterParaMinutos(intFim);
                 duracaoIntervaloTurno = (intFimMin < intIniMin) ? 0 : intFimMin - intIniMin;
             }

             let duracaoLiquidaTurno = Math.max(0, duracaoBrutaTurno - duracaoIntervaloTurno);

             if (duracaoLiquidaTurno > 0 && hAula) {
                 duracaoLiquidaTurno *= HORA_AULA_FACTOR;
             }
             duracaoTotalDia += duracaoLiquidaTurno;
         } // Fim loop turnos

         // Se escala estiver vazia (0), esperado é 0. Se não, é o calculado.
         duracaoEsperadaPorDiaSemana[diasIdx[dia]] = Math.round(duracaoTotalDia);

    } // Fim loop dias

     duracaoEsperadaPorDiaSemana[0] = 0; // Domingo
     duracaoEsperadaPorDiaSemana[6] = 0; // Sábado
     // --- Fim leitura escala semanal detalhada ---


    // --- PRIMEIRO LOOP ---
    linhas.forEach(linha => {
        const entrada = linha.querySelector('.entrada').value;
        const saida = linha.querySelector('.saida').value;
        const horaAula = linha.querySelector('.hora-aula').checked;
        const dataStr = linha.querySelector('.data').value;

        let minutosDiaCompensados = 0;

        if (entrada && saida) {
            const entradaMin = converterParaMinutos(entrada);
            const saidaMin = converterParaMinutos(saida);
            minutosDiaCompensados = calcularMinutosComAdicional(entradaMin, saidaMin);
        }

        const intervalos = linha.querySelectorAll('.intervalo-pair');
        intervalos.forEach(pair => {
            const intervaloInicio = pair.querySelector('.intervalo-inicio').value;
            const intervaloFim = pair.querySelector('.intervalo-fim').value;

            if (intervaloInicio && intervaloFim) {
                const intervaloInicioMin = converterParaMinutos(intervaloInicio);
                const intervaloFimMin = converterParaMinutos(intervaloFim);
                const minutosIntervaloCompensados = calcularMinutosComAdicional(intervaloInicioMin, intervaloFimMin);
                minutosDiaCompensados -= minutosIntervaloCompensados;
            }
        });

        if (minutosDiaCompensados > 0 && horaAula) {
            minutosDiaCompensados = minutosDiaCompensados * HORA_AULA_FACTOR;
        }

        minutosDiaCompensados = Math.max(0, minutosDiaCompensados);

        const minutosArredondados = Math.round(minutosDiaCompensados);
        linha.querySelector('.horas-dia').textContent = converterParaHora(minutosArredondados);
        totalMinutosMes += minutosArredondados;

        if (dataStr && minutosArredondados >= 0) {
             let duracaoEsperadaParaEsteDia = HORAS_DIA_PADRAO_MIN; // Padrão
             try {
                  const dataObj = new Date(dataStr + 'T00:00:00');
                  if (!isNaN(dataObj.getTime())) {
                       const diaSemana = dataObj.getDay();
                       // Pega o valor calculado, ou 0 se não estiver definido (Sab/Dom ou Quinta vazia)
                       duracaoEsperadaParaEsteDia = duracaoEsperadaPorDiaSemana[diaSemana] || 0;
                  }
             } catch(e) { /* Usa padrão 8h se data for inválida */ }

             if (!totaisPorData[dataStr]) {
                 totaisPorData[dataStr] = { total: 0, esperado: duracaoEsperadaParaEsteDia };
             }
             totaisPorData[dataStr].total += minutosArredondados;
             totaisPorData[dataStr].esperado = duracaoEsperadaParaEsteDia;

             if (minutosArredondados > 0) {
                diasTrabalhados.add(dataStr);
             }
        }
    });

    // --- SEGUNDO LOOP: Aplica saldo diário COM TOLERÂNCIA ---
    const todasLinhasArray = Array.from(linhas);

    linhas.forEach((linha, index) => {
         const dataStr = linha.querySelector('.data').value;
         const tdSaldo = linha.querySelector('.saldo-dia');
         const minutosArredondadosLinha = converterParaMinutos(linha.querySelector('.horas-dia').textContent);

         if (!tdSaldo) return;

         let saldoMinutosDiaCalculado = 0;
         let saldoMinutosDiaExibido = 0;
         let classeSaldo = '';
         let deveMostrarSaldo = false;
         let minutosTrabalhadosNoDia = 0;
         let duracaoEsperadaParaEsteDia = HORAS_DIA_PADRAO_MIN; // Padrão

         const nextRow = todasLinhasArray[index + 1];
         const nextDataStr = nextRow ? nextRow.querySelector('.data').value : null;

         if (!dataStr) {
             deveMostrarSaldo = true;
             minutosTrabalhadosNoDia = minutosArredondadosLinha;
             saldoMinutosDiaCalculado = minutosTrabalhadosNoDia - HORAS_DIA_PADRAO_MIN;
         } else if (!nextRow || nextDataStr !== dataStr || !nextDataStr) {
             deveMostrarSaldo = true;
             if (totaisPorData[dataStr]) {
                 minutosTrabalhadosNoDia = totaisPorData[dataStr].total;
                 duracaoEsperadaParaEsteDia = totaisPorData[dataStr].esperado;
                 saldoMinutosDiaCalculado = minutosTrabalhadosNoDia - duracaoEsperadaParaEsteDia;
             } else {
                 minutosTrabalhadosNoDia = minutosArredondadosLinha;
                 saldoMinutosDiaCalculado = minutosTrabalhadosNoDia - HORAS_DIA_PADRAO_MIN;
             }
         }

         if (deveMostrarSaldo) {
              if (saldoMinutosDiaCalculado >= -TOLERANCIA_MINUTOS && saldoMinutosDiaCalculado < 0 && duracaoEsperadaParaEsteDia > 0) {
                   saldoMinutosDiaExibido = 0;
              } else {
                   saldoMinutosDiaExibido = saldoMinutosDiaCalculado;
              }

             if (saldoMinutosDiaExibido > 0) {
                 classeSaldo = 'saldo-positivo';
             } else if (saldoMinutosDiaExibido < 0) {
                 classeSaldo = 'saldo-negativo';
             } else if (minutosTrabalhadosNoDia > 0){
                 classeSaldo = 'saldo-neutro';
             }
         }

         let textoSaldo = deveMostrarSaldo ? converterParaHora(saldoMinutosDiaExibido) : '';
         if (deveMostrarSaldo && saldoMinutosDiaExibido > 0) {
             textoSaldo = '+' + textoSaldo;
         }
         tdSaldo.textContent = textoSaldo;

         tdSaldo.classList.remove('saldo-positivo', 'saldo-negativo', 'saldo-neutro');
         if (deveMostrarSaldo && classeSaldo) {
             tdSaldo.classList.add(classeSaldo);
         }
    });

    // --- Finaliza cálculo do total e saldo do mês (COM FERIADOS E ESCALA SEMANAL) ---
    const horasExternasStr = document.getElementById('horas-externas').value;
    const minutosExternos = converterParaMinutos(horasExternasStr);
    totalMinutosMes += minutosExternos;

    const horasSubtrairStr = document.getElementById('horas-subtrair').value;
    const minutosSubtrair = converterParaMinutos(horasSubtrairStr);
    totalMinutosMes -= minutosSubtrair;

    const feriadosInput = document.getElementById('feriados-mes');
    const numeroDeFeriados = parseInt(feriadosInput.value, 10) || 0;

    let horasEsperadasMes = 0;
    // Itera sobre os dias trabalhados (Set)
    diasTrabalhados.forEach(dia => {
        if(totaisPorData[dia] && totaisPorData[dia].esperado !== undefined) {
             horasEsperadasMes += totaisPorData[dia].esperado;
        } else {
             try {
               const dataObj = new Date(dia + 'T00:00:00');
               if(!isNaN(dataObj.getTime())) {
                  const diaSemana = dataObj.getDay();
                  horasEsperadasMes += (duracaoEsperadaPorDiaSemana[diaSemana] || 0); // Usa 0 se for Sab/Dom/Vazio
               } else {
                  horasEsperadasMes += HORAS_DIA_PADRAO_MIN;
               }
            } catch(e) {
               horasEsperadasMes += HORAS_DIA_PADRAO_MIN;
            }
        }
    });

    // Remove a expectativa de 8h (padrão) para cada dia de feriado
    horasEsperadasMes -= (numeroDeFeriados * HORAS_DIA_PADRAO_MIN);
    horasEsperadasMes = Math.max(0, horasEsperadasMes);

    // Atualiza Total do Mês
    document.getElementById('total-mes').textContent = converterParaHora(totalMinutosMes);

    // Calcula e Atualiza Saldo do Mês
    const saldoMinutosMes = totalMinutosMes - horasEsperadasMes;
    const saldoMesContainer = document.getElementById('saldo-mes-container');
    const saldoMesSpan = document.getElementById('saldo-mes');

    let textoSaldoMes = converterParaHora(saldoMinutosMes);
    if (saldoMinutosMes > 0) {
        textoSaldoMes = '+' + textoSaldoMes;
    }
    if(saldoMesSpan) saldoMesSpan.textContent = textoSaldoMes;


    if(saldoMesContainer) {
        saldoMesContainer.classList.remove('saldo-positivo', 'saldo-negativo', 'saldo-neutro');
        if (saldoMinutosMes > 0) {
            saldoMesContainer.classList.add('saldo-positivo');
        } else if (saldoMinutosMes < 0) {
            saldoMesContainer.classList.add('saldo-negativo');
        } else if (totalMinutosMes > 0 || diasTrabalhados.size > 0) {
             saldoMesContainer.classList.add('saldo-neutro');
        }
    }

    calcularResumoSemanal();
}


// --- FUNÇÃO (Cálculo Semanal) ---
function calcularResumoSemanal() {
    const semanas = {};
    const linhas = document.querySelectorAll("#corpo-tabela tr");

    linhas.forEach((linha) => {
        const dataStr = linha.querySelector(".data").value;
        const horasStr =
            linha.querySelector(".horas-dia").textContent;

        if (dataStr && horasStr) {
            const inicioSemana = getInicioDaSemana(dataStr);
             if (!inicioSemana) return;

             const minutosDia = converterParaMinutos(horasStr);
            if (minutosDia === 0) return;


            if (!semanas[inicioSemana]) {
                semanas[inicioSemana] = 0;
            }
            semanas[inicioSemana] += minutosDia;
        }
    });

    const container = document.getElementById("resumo-semanal");
    container.innerHTML = "";

    const chavesSemanas = Object.keys(semanas).sort();

    if (chavesSemanas.length === 0) {
        container.innerHTML = "<span>Nenhum dado com data.</span>";
        return;
    }

    chavesSemanas.forEach((chave) => {
        const totalHorasSemana = converterParaHora(semanas[chave]);
        const [y, m, d] = chave.split("-");
        const dataFormatada = `${d}/${m}`;

        container.innerHTML += `<div>Semana de ${dataFormatada}: <strong>${totalHorasSemana}</strong></div>`;
    });
}

// --- FUNÇÃO (Helper de Data) ---
 function getInicioDaSemana(dataStr) {
     if (!dataStr || !dataStr.includes('-')) return null;
     try {
         const [ano, mes, dia] = dataStr.split('-').map(Number);
         const data = new Date(Date.UTC(ano, mes - 1, dia));
         if (isNaN(data.getTime())) return null;

         const diaDaSemana = data.getUTCDay();
         const dataInicio = new Date(data.getTime());
         dataInicio.setUTCDate(data.getUTCDate() - diaDaSemana);

         const y = dataInicio.getUTCFullYear();
         const m = String(dataInicio.getUTCMonth() + 1).padStart(2, "0");
         const d = String(dataInicio.getUTCDate()).padStart(2, "0");
         return `${y}-${m}-${d}`;
     } catch(e) {
         console.error("Erro ao processar data em getInicioDaSemana:", dataStr, e);
         return null;
     }
 }


// --- FUNÇÃO (Ordenação por Data) ---
function ordenarPorData() {
    const thData = document.getElementById("th-data");
    const tbody = document.getElementById("corpo-tabela");
    const linhas = Array.from(tbody.querySelectorAll("tr"));

    const direcaoAtual = thData.dataset.sortDirection || "desc";
    const novaDirecao = direcaoAtual === "asc" ? "desc" : "asc";
    thData.dataset.sortDirection = novaDirecao;

    thData
        .closest("tr")
        .querySelectorAll("th")
        .forEach((th) => {
            if (th.id !== "th-data") {
                th.innerHTML = th.innerHTML
                    .replace(" ▴", "")
                    .replace(" ▾", "");
            }
        });
    thData.innerHTML =
        "Data " + (novaDirecao === "asc" ? "▴" : "▾");

    const modificador = novaDirecao === "asc" ? 1 : -1;

    linhas.sort((linhaA, linhaB) => {
        const dataAStr = linhaA.querySelector(".data").value;
        const dataBStr = linhaB.querySelector(".data").value;

        if (dataAStr && !dataBStr) return -1;
        if (!dataAStr && dataBStr) return 1;
        if (!dataAStr && !dataBStr) return 0;

        let comparacao = dataAStr.localeCompare(dataBStr);

        return comparacao * modificador;
    });

    linhas.forEach((linha) => {
        tbody.appendChild(linha);
    });
}

// --- FUNÇÕES CONVERSORAS ---
function converterParaMinutos(horaStr) {
     if (!horaStr || horaStr.indexOf(':') === -1) return 0;
     const isNegative = horaStr.startsWith('-');
     const horaLimpa = horaStr.replace('-', '');
     const parts = horaLimpa.split(':');
     const h = parseInt(parts[0], 10);
     const m = parseInt(parts[1], 10);

     if (horaStr === '24:00') return 1440;
     if (isNaN(h) || isNaN(m)) return 0;
     const totalMinutos = h * 60 + m;
     return isNegative ? -totalMinutos : totalMinutos;
}

function converterParaHora(minutos) {
     if (minutos > -1 && minutos < 0) {
         minutos = 0;
     }
    const isNegative = minutos < 0;
    const absMinutos = Math.abs(minutos);

    const h = Math.floor(absMinutos / 60);
    const m = Math.round(absMinutos % 60);

    let horaFormatada;

    if (m === 60) {
         horaFormatada = `${String(h + 1).padStart(2, '0')}:00`;
    } else {
         horaFormatada = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    if(horaFormatada === '00:00') return '00:00';

    return isNegative ? '-' + horaFormatada : horaFormatada;
}


// --- FUNÇÕES Salvar e Carregar (JSON Local - COM ESCALA SEMANAL DETALHADA E FERIADOS) ---
function salvarDados() {
     const dias = ['seg', 'ter', 'qua', 'qui', 'sex'];
     const escala = {};
     for (const dia of dias) {
          escala[dia] = {}; // Cria objeto para o dia
          for(let turno = 1; turno <= 2; turno++) {
               escala[dia][`e${turno}`] = document.getElementById(`escala-entrada${turno}-${dia}`).value || '';
               escala[dia][`s${turno}`] = document.getElementById(`escala-saida${turno}-${dia}`).value || '';
               escala[dia][`intIni${turno}`] = document.getElementById(`escala-int-inicio${turno}-${dia}`).value || '';
               escala[dia][`intFim${turno}`] = document.getElementById(`escala-int-fim${turno}-${dia}`).value || '';
               escala[dia][`hAula${turno}`] = document.getElementById(`escala-hora-aula${turno}-${dia}`).checked;
          }
     }

    const dados = {
        horasExternas: document.getElementById("horas-externas").value,
        horasSubtrair: document.getElementById("horas-subtrair").value,
        feriadosMes: document.getElementById("feriados-mes").value,
        escala: escala, // Salva a escala semanal detalhada
        linhas: [],
    };

    document.querySelectorAll("#corpo-tabela tr").forEach((linha) => {
        const linhaDados = {
            data: linha.querySelector(".data").value,
            atividade: linha.querySelector(".atividade").value,
            entrada: linha.querySelector(".entrada").value,
            saida: linha.querySelector(".saida").value,
            horaAula: linha.querySelector(".hora-aula").checked,
            intervalos: [],
        };

        linha.querySelectorAll(".intervalo-pair").forEach((pair) => {
            linhaDados.intervalos.push({
                inicio: pair.querySelector(".intervalo-inicio").value,
                fim: pair.querySelector(".intervalo-fim").value,
            });
        });
        dados.linhas.push(linhaDados);
    });

    const dataStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "calculadora_horas.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

function carregarDados(event) {
     const dias = ['seg', 'ter', 'qua', 'qui', 'sex'];
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const dados = JSON.parse(e.target.result);

            document.getElementById("corpo-tabela").innerHTML = "";

            document.getElementById("horas-externas").value =
                dados.horasExternas || "";
            document.getElementById("horas-subtrair").value =
                dados.horasSubtrair || "";
            document.getElementById("feriados-mes").value =
                dados.feriadosMes || 0;

            // Carrega a escala semanal detalhada do JSON, se existir
            if (dados.escala) {
                for (const dia of dias) {
                     const escalaDia = dados.escala[dia] || {}; // Pega dados do dia ou objeto vazio
                     for(let turno = 1; turno <= 2; turno++) {
                         // Verifica se o campo existe no HTML antes de tentar definir (segurança)
                         const e = document.getElementById(`escala-entrada${turno}-${dia}`);
                         const s = document.getElementById(`escala-saida${turno}-${dia}`);
                         const intIni = document.getElementById(`escala-int-inicio${turno}-${dia}`);
                         const intFim = document.getElementById(`escala-int-fim${turno}-${dia}`);
                         const hAula = document.getElementById(`escala-hora-aula${turno}-${dia}`);

                         if(e) e.value = escalaDia[`e${turno}`] || '';
                         if(s) s.value = escalaDia[`s${turno}`] || '';
                         if(intIni) intIni.value = escalaDia[`intIni${turno}`] || '';
                         if(intFim) intFim.value = escalaDia[`intFim${turno}`] || '';
                         if(hAula) hAula.checked = escalaDia[`hAula${turno}`] || false;
                     }
                }
            } else {
                // Limpa todos os campos da escala se 'dados.escala' não existir (JSON antigo)
                for (const dia of dias) {
                     for(let turno = 1; turno <= 2; turno++) {
                          document.getElementById(`escala-entrada${turno}-${dia}`).value = '';
                          document.getElementById(`escala-saida${turno}-${dia}`).value = '';
                          document.getElementById(`escala-int-inicio${turno}-${dia}`).value = '';
                          document.getElementById(`escala-int-fim${turno}-${dia}`).value = '';
                          document.getElementById(`escala-hora-aula${turno}-${dia}`).checked = false;
                     }
                }
            }


            if (!dados.linhas || dados.linhas.length === 0) {
                adicionarLinha();
                calcularHoras();
                return;
            }

            dados.linhas.forEach((linhaDados) => {
                const novaLinha = adicionarLinha();

                novaLinha.querySelector(".data").value =
                    linhaDados.data || "";
                novaLinha.querySelector(".atividade").value =
                    linhaDados.atividade || "";
                novaLinha.querySelector(".entrada").value =
                    linhaDados.entrada || "";
                novaLinha.querySelector(".saida").value =
                    linhaDados.saida || "";
                novaLinha.querySelector(".hora-aula").checked =
                    linhaDados.horaAula || false;

                const container = novaLinha.querySelector(
                    ".intervalo-container",
                );
                const primeiroIntervaloPair =
                    container.querySelector(".intervalo-pair");

                if (linhaDados.intervalos && linhaDados.intervalos[0]) {
                    primeiroIntervaloPair.querySelector(
                        ".intervalo-inicio",
                    ).value = linhaDados.intervalos[0].inicio || "";
                    primeiroIntervaloPair.querySelector(
                        ".intervalo-fim",
                    ).value = linhaDados.intervalos[0].fim || "";
                }

                let ultimoBotaoAdicionar = primeiroIntervaloPair.querySelector('.add-intervalo');
                for (let i = 1; i < (linhaDados.intervalos || []).length; i++) {
                     adicionarIntervalo(ultimoBotaoAdicionar);

                     const ultimoPairAdicionado = container.querySelector('.intervalo-pair:last-child');

                     if (ultimoPairAdicionado) {
                         ultimoPairAdicionado.querySelector('.intervalo-inicio').value = linhaDados.intervalos[i].inicio || '';
                         ultimoPairAdicionado.querySelector('.intervalo-fim').value = linhaDados.intervalos[i].fim || '';
                         ultimoBotaoAdicionar = ultimoPairAdicionado.querySelector('.add-intervalo');
                     } else {
                         console.error("Não foi possível encontrar o último par de intervalo adicionado.");
                         break;
                     }
                }
            });

            calcularHoras(); // Recalcula tudo após preencher
        } catch (err) {
            console.error("Erro ao ler ou processar o arquivo JSON:", err);
            alert("Erro ao ler o arquivo JSON: " + err.message + ". Verifique o console (F12) para detalhes.");
             if (document.getElementById("corpo-tabela").children.length === 0) {
                 adicionarLinha();
             }
        }
    };

    reader.readAsText(file);
    event.target.value = null;
}

// --- INICIALIZAÇÃO DA PÁGINA ---
adicionarLinha();
calcularResumoSemanal();
calcularHoras();
</script>
