import { addWeeks, addMonths, addYears } from 'date-fns';

export type FrequenciaRepeticao = 'semanal' | 'quinzenal' | 'mensal' | 'anual';

export function calcularProximaData(
  dataBase: Date, 
  frequencia: FrequenciaRepeticao, 
  incremento: number
): Date {
  switch (frequencia) {
    case 'semanal':
      return addWeeks(dataBase, incremento);
    case 'quinzenal':
      return addWeeks(dataBase, incremento * 2);
    case 'mensal':
      return addMonths(dataBase, incremento);
    case 'anual':
      return addYears(dataBase, incremento);
  }
}

export function gerarDatasParcelamento(
  dataInicial: Date,
  numeroParcelas: number,
  frequencia: FrequenciaRepeticao
): Date[] {
  const datas: Date[] = [];
  for (let i = 0; i < numeroParcelas; i++) {
    datas.push(calcularProximaData(dataInicial, frequencia, i));
  }
  return datas;
}

export function gerarDatasRecorrencia(
  dataInicial: Date,
  mesesRecorrencia: number,
  frequencia: FrequenciaRepeticao
): Date[] {
  const datas: Date[] = [];
  
  // Para recorrência, geramos lançamentos até cobrir o período
  const totalLancamentos = calcularQuantidadeLancamentos(mesesRecorrencia, frequencia);
  
  for (let i = 0; i < totalLancamentos; i++) {
    datas.push(calcularProximaData(dataInicial, frequencia, i));
  }
  
  return datas;
}

function calcularQuantidadeLancamentos(meses: number, frequencia: FrequenciaRepeticao): number {
  switch (frequencia) {
    case 'semanal':
      return Math.ceil(meses * 4.33); // ~4.33 semanas por mês
    case 'quinzenal':
      return Math.ceil(meses * 2); // 2 quinzenas por mês
    case 'mensal':
      return meses;
    case 'anual':
      return Math.ceil(meses / 12);
  }
}
