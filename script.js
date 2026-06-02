// RI值表（随机一致性指标）
const RI_TABLE = {
    1: 0,
    2: 0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initCriteriaMatrix();
    initAlternativesMatrices();
});

// 获取准则名称列表
function getCriteriaNames() {
    const inputs = document.querySelectorAll('.criterion-name');
    return Array.from(inputs).map(input => input.value.trim()).filter(name => name);
}

// 获取方案名称列表
function getAlternativeNames() {
    const inputs = document.querySelectorAll('.alternative-name');
    return Array.from(inputs).map(input => input.value.trim()).filter(name => name);
}

// 添加准则
function addCriterion() {
    const container = document.querySelector('.criteria-inputs');
    const count = container.querySelectorAll('input').length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'criterion-name';
    input.placeholder = `准则${count}`;
    container.appendChild(input);
    initCriteriaMatrix();
    initAlternativesMatrices();
}

// 添加方案
function addAlternative() {
    const container = document.querySelector('.alternatives-inputs');
    const count = container.querySelectorAll('input').length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'alternative-name';
    input.placeholder = `方案${count}`;
    container.appendChild(input);
    initAlternativesMatrices();
}

// 初始化准则层判断矩阵
function initCriteriaMatrix() {
    const criteria = getCriteriaNames();
    const n = criteria.length;
    const container = document.getElementById('criteria-matrix');
    
    if (n < 2) {
        container.innerHTML = '<p style="color:#888;">请至少输入2个准则</p>';
        return;
    }
    
    let html = '<table>';
    html += '<tr><th></th>';
    criteria.forEach(c => {
        html += `<th>${c}</th>`;
    });
    html += '</tr>';
    
    criteria.forEach((c1, i) => {
        html += `<tr><th>${c1}</th>`;
        criteria.forEach((c2, j) => {
            if (i === j) {
                html += `<td class="diagonal">1</td>`;
            } else if (i > j) {
                html += `<td class="reciprocal" id="criteria-${i}-${j}">-</td>`;
            } else {
                html += `<td><input type="number" step="0.01" min="0.11" max="9" value="1" id="criteria-${i}-${j}" onchange="updateReciprocal('criteria', ${i}, ${j}, ${n})"></td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</table>';
    container.innerHTML = html;
}

// 初始化方案层判断矩阵
function initAlternativesMatrices() {
    const criteria = getCriteriaNames();
    const alternatives = getAlternativeNames();
    const container = document.getElementById('alternatives-matrices');
    
    if (criteria.length < 1 || alternatives.length < 2) {
        container.innerHTML = '<p style="color:#888;">请至少输入1个准则和2个方案</p>';
        return;
    }
    
    let html = '';
    criteria.forEach((criterion, cIdx) => {
        const n = alternatives.length;
        html += `<div class="matrix-container">`;
        html += `<h4>基于"${criterion}"的方案比较</h4>`;
        html += '<table>';
        html += '<tr><th></th>';
        alternatives.forEach(a => {
            html += `<th>${a}</th>`;
        });
        html += '</tr>';
        
        alternatives.forEach((a1, i) => {
            html += `<tr><th>${a1}</th>`;
            alternatives.forEach((a2, j) => {
                if (i === j) {
                    html += `<td class="diagonal">1</td>`;
                } else if (i > j) {
                    html += `<td class="reciprocal" id="alt-${cIdx}-${i}-${j}">-</td>`;
                } else {
                    html += `<td><input type="number" step="0.01" min="0.11" max="9" value="1" id="alt-${cIdx}-${i}-${j}" onchange="updateReciprocal('alt', ${cIdx}, ${i}, ${j}, ${n})"></td>`;
                }
            });
            html += '</tr>';
        });
        
        html += '</table></div>';
    });
    
    container.innerHTML = html;
}

// 更新互反值
function updateReciprocal(type, cIdx, i, j, n) {
    const inputId = `${type}${cIdx !== undefined ? '-' + cIdx : ''}-${i}-${j}`;
    const reciprocalId = `${type}${cIdx !== undefined ? '-' + cIdx : ''}-${j}-${i}`;
    
    const input = document.getElementById(inputId);
    const reciprocalCell = document.getElementById(reciprocalId);
    
    if (input && reciprocalCell) {
        const value = parseFloat(input.value);
        if (value > 0) {
            reciprocalCell.textContent = (1 / value).toFixed(4);
        }
    }
}

// 获取判断矩阵的值
function getMatrixValues(type, cIdx, n) {
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1;
            } else if (i < j) {
                const input = document.getElementById(`${type}${cIdx !== undefined ? '-' + cIdx : ''}-${i}-${j}`);
                matrix[i][j] = input ? parseFloat(input.value) || 1 : 1;
            } else {
                matrix[i][j] = 1 / matrix[j][i];
            }
        }
    }
    return matrix;
}

// 几何平均法计算权重
function calculateWeights(matrix, n) {
    // 计算每行元素的乘积
    const rowProducts = [];
    for (let i = 0; i < n; i++) {
        let product = 1;
        for (let j = 0; j < n; j++) {
            product *= matrix[i][j];
        }
        rowProducts.push(product);
    }
    
    // 计算n次方根
    const roots = rowProducts.map(p => Math.pow(p, 1 / n));
    
    // 归一化得到权重
    const sum = roots.reduce((a, b) => a + b, 0);
    const weights = roots.map(r => r / sum);
    
    return {
        rowProducts: rowProducts,
        roots: roots,
        sum: sum,
        weights: weights
    };
}

// 一致性检验
function consistencyCheck(matrix, weights, n) {
    // 计算 Aw = A * w
    const Aw = [];
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            sum += matrix[i][j] * weights[j];
        }
        Aw.push(sum);
    }
    
    // 计算 λmax
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
        lambdaMax += Aw[i] / weights[i];
    }
    lambdaMax /= n;
    
    // 计算 CI
    const CI = (lambdaMax - n) / (n - 1);
    
    // 获取 RI
    const RI = RI_TABLE[n] || 0;
    
    // 计算 CR
    const CR = RI > 0 ? CI / RI : 0;
    
    return {
        Aw: Aw,
        lambdaMax: lambdaMax,
        CI: CI,
        RI: RI,
        CR: CR,
        passed: CR < 0.1
    };
}

// 主计算函数
function calculateAHP() {
    const criteria = getCriteriaNames();
    const alternatives = getAlternativeNames();
    
    if (criteria.length < 2) {
        alert('请至少输入2个准则！');
        return;
    }
    
    if (alternatives.length < 2) {
        alert('请至少输入2个方案！');
        return;
    }
    
    // 1. 计算准则层权重
    const criteriaMatrix = getMatrixValues('criteria', undefined, criteria.length);
    const criteriaResult = calculateWeights(criteriaMatrix, criteria.length);
    const criteriaConsistency = consistencyCheck(criteriaMatrix, criteriaResult.weights, criteria.length);
    
    // 2. 计算每个准则下的方案权重
    const alternativesResults = [];
    const alternativesConsistencies = [];
    
    for (let c = 0; c < criteria.length; c++) {
        const altMatrix = getMatrixValues('alt', c, alternatives.length);
        const altResult = calculateWeights(altMatrix, alternatives.length);
        const altConsistency = consistencyCheck(altMatrix, altResult.weights, alternatives.length);
        
        alternativesResults.push(altResult);
        alternativesConsistencies.push(altConsistency);
    }
    
    // 3. 层次总排序
    const totalScores = [];
    for (let a = 0; a < alternatives.length; a++) {
        let score = 0;
        for (let c = 0; c < criteria.length; c++) {
            score += criteriaResult.weights[c] * alternativesResults[c].weights[a];
        }
        totalScores.push(score);
    }
    
    // 4. 层次总排序一致性检验
    let totalCI = 0;
    let totalRI = 0;
    for (let c = 0; c < criteria.length; c++) {
        totalCI += criteriaResult.weights[c] * alternativesConsistencies[c].CI;
        totalRI += criteriaResult.weights[c] * alternativesConsistencies[c].RI;
    }
    const totalCR = totalRI > 0 ? totalCI / totalRI : 0;
    
    // 显示结果
    displayResults(
        criteria, alternatives,
        criteriaMatrix, criteriaResult, criteriaConsistency,
        alternativesResults, alternativesConsistencies,
        totalScores, totalCI, totalRI, totalCR
    );
}

// 显示结果
function displayResults(
    criteria, alternatives,
    criteriaMatrix, criteriaResult, criteriaConsistency,
    alternativesResults, alternativesConsistencies,
    totalScores, totalCI, totalRI, totalCR
) {
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block';
    
    // 1. 准则层权重
    let criteriaHtml = '<table>';
    criteriaHtml += '<tr><th>准则</th><th>行乘积</th><th>n次方根</th><th>权重</th></tr>';
    for (let i = 0; i < criteria.length; i++) {
        criteriaHtml += `<tr>
            <td>${criteria[i]}</td>
            <td>${criteriaResult.rowProducts[i].toFixed(4)}</td>
            <td>${criteriaResult.roots[i].toFixed(4)}</td>
            <td class="highlight">${criteriaResult.weights[i].toFixed(4)}</td>
        </tr>`;
    }
    criteriaHtml += `<tr><td><strong>SUM</strong></td><td></td><td>${criteriaResult.sum.toFixed(4)}</td><td>1.0000</td></tr>`;
    criteriaHtml += '</table>';
    document.getElementById('criteria-weights-result').innerHTML = criteriaHtml;
    
    // 2. 准则层一致性检验
    let consistencyHtml = '<table>';
    consistencyHtml += '<tr><th>指标</th><th>值</th></tr>';
    consistencyHtml += `<tr><td>λmax</td><td>${criteriaConsistency.lambdaMax.toFixed(4)}</td></tr>`;
    consistencyHtml += `<tr><td>CI</td><td>${criteriaConsistency.CI.toFixed(6)}</td></tr>`;
    consistencyHtml += `<tr><td>RI</td><td>${criteriaConsistency.RI.toFixed(4)}</td></tr>`;
    consistencyHtml += `<tr><td>CR</td><td class="${criteriaConsistency.passed ? 'consistency-pass' : 'consistency-fail'}">${criteriaConsistency.CR.toFixed(4)} ${criteriaConsistency.passed ? '✓ 通过一致性检验' : '✗ 未通过一致性检验'}</td></tr>`;
    consistencyHtml += '</table>';
    document.getElementById('criteria-consistency-result').innerHTML = consistencyHtml;
    
    // 3. 方案层权重
    let altHtml = '';
    for (let c = 0; c < criteria.length; c++) {
        altHtml += `<div class="matrix-container">`;
        altHtml += `<h4>基于"${criteria[c]}"的方案权重</h4>`;
        altHtml += '<table>';
        altHtml += '<tr><th>方案</th><th>行乘积</th><th>n次方根</th><th>权重</th></tr>';
        for (let a = 0; a < alternatives.length; a++) {
            altHtml += `<tr>
                <td>${alternatives[a]}</td>
                <td>${alternativesResults[c].rowProducts[a].toFixed(4)}</td>
                <td>${alternativesResults[c].roots[a].toFixed(4)}</td>
                <td class="highlight">${alternativesResults[c].weights[a].toFixed(4)}</td>
            </tr>`;
        }
        altHtml += `<tr><td><strong>SUM</strong></td><td></td><td>${alternativesResults[c].sum.toFixed(4)}</td><td>1.0000</td></tr>`;
        altHtml += '</table>';
        
        // 一致性检验
        const cons = alternativesConsistencies[c];
        altHtml += '<table style="margin-top:10px;">';
        altHtml += '<tr><th>指标</th><th>值</th></tr>';
        altHtml += `<tr><td>λmax</td><td>${cons.lambdaMax.toFixed(4)}</td></tr>`;
        altHtml += `<tr><td>CI</td><td>${cons.CI.toFixed(6)}</td></tr>`;
        altHtml += `<tr><td>RI</td><td>${cons.RI.toFixed(4)}</td></tr>`;
        altHtml += `<tr><td>CR</td><td class="${cons.passed ? 'consistency-pass' : 'consistency-fail'}">${cons.CR.toFixed(4)} ${cons.passed ? '✓ 通过' : '✗ 未通过'}</td></tr>`;
        altHtml += '</table>';
        altHtml += '</div>';
    }
    document.getElementById('alternatives-weights-result').innerHTML = altHtml;
    
    // 4. 层次总排序
    let totalHtml = '<table>';
    totalHtml += '<tr><th>指标</th><th>权重</th>';
    alternatives.forEach(a => {
        totalHtml += `<th>${a}</th>`;
    });
    totalHtml += '</tr>';
    
    for (let c = 0; c < criteria.length; c++) {
        totalHtml += `<tr><td>${criteria[c]}</td><td>${criteriaResult.weights[c].toFixed(4)}</td>`;
        for (let a = 0; a < alternatives.length; a++) {
            totalHtml += `<td>${alternativesResults[c].weights[a].toFixed(4)}</td>`;
        }
        totalHtml += '</tr>';
    }
    
    totalHtml += '<tr class="highlight"><td><strong>最终得分</strong></td><td></td>';
    for (let a = 0; a < alternatives.length; a++) {
        totalHtml += `<td><strong>${totalScores[a].toFixed(4)}</strong></td>`;
    }
    totalHtml += '</tr>';
    totalHtml += '</table>';
    document.getElementById('total-ranking-result').innerHTML = totalHtml;
    
    // 5. 总排序一致性检验
    let totalConsHtml = '<table>';
    totalConsHtml += '<tr><th>指标</th><th>值</th></tr>';
    totalConsHtml += `<tr><td>CI</td><td>${totalCI.toFixed(6)}</td></tr>`;
    totalConsHtml += `<tr><td>RI</td><td>${totalRI.toFixed(6)}</td></tr>`;
    totalConsHtml += `<tr><td>CR</td><td class="${totalCR < 0.1 ? 'consistency-pass' : 'consistency-fail'}">${totalCR.toFixed(4)} ${totalCR < 0.1 ? '✓ 通过一致性检验' : '✗ 未通过一致性检验'}</td></tr>`;
    totalConsHtml += '</table>';
    document.getElementById('total-consistency-result').innerHTML = totalConsHtml;
    
    // 6. 最终结果
    const maxScore = Math.max(...totalScores);
    const winnerIndex = totalScores.indexOf(maxScore);
    const winner = alternatives[winnerIndex];
    
    let finalHtml = `<div class="winner"> ${winner}</div>`;
    finalHtml += '<p style="text-align:center;margin-bottom:20px;">综合得分：' + maxScore.toFixed(4) + '</p>';
    
    // 得分柱状图
    for (let a = 0; a < alternatives.length; a++) {
        const percentage = (totalScores[a] / maxScore * 100).toFixed(1);
        finalHtml += `<div class="score-bar">
            <span class="name">${alternatives[a]}</span>
            <div class="bar"><div class="bar-fill" style="width:${percentage}%"></div></div>
            <span class="value">${totalScores[a].toFixed(4)}</span>
        </div>`;
    }
    
    document.getElementById('final-result').innerHTML = finalHtml;
    
    // 滚动到结果区域
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// 重置所有
function resetAll() {
    if (confirm('确定要重置所有输入吗？')) {
        document.getElementById('goal').value = '';
        document.querySelectorAll('.criterion-name').forEach((input, i) => {
            input.value = i < 4 ? ['景色', '吃住', '价格', '人文'][i] : '';
        });
        document.querySelectorAll('.alternative-name').forEach((input, i) => {
            input.value = i < 3 ? ['南京', '桂林', '三亚'][i] : '';
        });
        initCriteriaMatrix();
        initAlternativesMatrices();
        document.getElementById('results-section').style.display = 'none';
    }
}

// 加载例题数据
function loadExample() {
    // 设置准则
    const criteriaInputs = document.querySelectorAll('.criterion-name');
    const criteriaNames = ['景色', '吃住', '价格', '人文'];
    criteriaInputs.forEach((input, i) => {
        if (i < 4) input.value = criteriaNames[i];
    });
    
    // 设置方案
    const altInputs = document.querySelectorAll('.alternative-name');
    const altNames = ['南京', '桂林', '三亚'];
    altInputs.forEach((input, i) => {
        if (i < 3) input.value = altNames[i];
    });
    
    // 重新初始化矩阵
    initCriteriaMatrix();
    initAlternativesMatrices();
    
    // 填充准则层判断矩阵
    // 景色-吃住: 0.25, 景色-价格: 2, 景色-人文: 0.33
    // 吃住-价格: 8, 吃住-人文: 2
    // 价格-人文: 0.2
    const criteriaValues = [
        [null, 0.25, 2, 0.33],
        [null, null, 8, 2],
        [null, null, null, 0.2],
        [null, null, null, null]
    ];
    
    for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
            const input = document.getElementById(`criteria-${i}-${j}`);
            if (input && criteriaValues[i][j]) {
                input.value = criteriaValues[i][j];
                updateReciprocal('criteria', undefined, i, j, 4);
            }
        }
    }
    
    // 填充方案层判断矩阵
    // 基于景色的方案比较
    const altValues = [
        // 景色: 南京-桂林=0.25, 南京-三亚=2, 桂林-三亚=8
        [[null, 0.25, 2], [null, null, 8], [null, null, null]],
        // 吃住: 南京-桂林=5, 南京-三亚=2, 桂林-三亚=0.5
        [[null, 5, 2], [null, null, 0.5], [null, null, null]],
        // 价格: 南京-桂林=0.33, 南京-三亚=2, 桂林-三亚=5
        [[null, 0.33, 2], [null, null, 5], [null, null, null]],
        // 人文: 南京-桂林=5, 南京-三亚=7, 桂林-三亚=2
        [[null, 5, 7], [null, null, 2], [null, null, null]]
    ];
    
    for (let c = 0; c < 4; c++) {
        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                const input = document.getElementById(`alt-${c}-${i}-${j}`);
                if (input && altValues[c][i][j]) {
                    input.value = altValues[c][i][j];
                    updateReciprocal('alt', c, i, j, 3);
                }
            }
        }
    }
    
    // 提示用户
    alert('例题数据已加载！点击"运行计算"按钮查看结果。');
}
