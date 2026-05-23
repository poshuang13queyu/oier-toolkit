import React, { useState, useEffect } from 'react';
import { parseNaturalLanguage } from '../core/parser/naturalParser';
import { generateData, SubtaskConfig } from '../core/generator/dataGenerator';
import { ParseResult, GenResult, GenMode } from '../core/parser/types';
import { PRESET_TEMPLATES } from '../core/generator/templates';
import { generateConfigYml, generateReadmeContent } from '../core/generator/configWriter';
import { INPUT_TEMPLATES, InputTemplate } from './inputTemplates';

declare const acquireVsCodeApi: () => {
  postMessage: (msg: any) => void;
};
const vscode = acquireVsCodeApi();

const DataGenPage: React.FC = () => {
  const [inputMode, setInputMode] = useState<'paste' | 'form' | 'code'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsedConfig, setParsedConfig] = useState<ParseResult | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [genCount, setGenCount] = useState(1);
  const [genCountInput, setGenCountInput] = useState('1');
  const [selectedGroup, setSelectedGroup] = useState(-1);
  const [genMode, setGenMode] = useState<GenMode>('simple');
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [subtasks, setSubtasks] = useState<SubtaskConfig[]>([]);
  const [genResult, setGenResult] = useState<GenResult | null>(null);
  const [genErrors, setGenErrors] = useState<string[]>([]);
  const [customTemplates, setCustomTemplates] = useState<InputTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('customInputTemplates');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputName, setCustomInputName] = useState('');

useEffect(() => {
  localStorage.setItem('customInputTemplates', JSON.stringify(customTemplates));
}, [customTemplates]);

const handleAddCustomTemplate = () => {
  if (!pasteText.trim()) return;
  if (!customInputName.trim()) return;
  const tpl: InputTemplate = { name: customInputName.trim(), description: pasteText.slice(0, 40) + '...', text: pasteText };
  setCustomTemplates(prev => [...prev, tpl]);
  setCustomInputName('');
  setShowCustomInput(false);
};

const handleDeleteCustomTemplate = (idx: number) => {
  setCustomTemplates(prev => prev.filter((_, i) => i !== idx));
};

const handlePasteParse = () => {
  setGenResult(null);
  const result = parseNaturalLanguage(pasteText);
  setParseErrors(result.errors);
  if (result.errors.length === 0) {
    setParsedConfig(result);
    setSelectedGroup(result.constraintGroups.length > 0 ? result.constraintGroups.length - 1 : -1);
  } else {
    setParsedConfig(null);
  }
};

const handleTemplateChange = (idx: number) => {
  setSelectedTemplate(idx);
  setSubtasks(PRESET_TEMPLATES[idx].subtasks.map(s => ({ ...s, strategies: [...s.strategies] })));
};

const handleGenerate = () => {
  if (!parsedConfig) return;
  setGenErrors([]);

  if (genMode === 'subtask') {
    let activeSubtasks = subtasks;
    if (activeSubtasks.length === 0) {
      activeSubtasks = PRESET_TEMPLATES[selectedTemplate].subtasks.map(s => ({ ...s, strategies: [...s.strategies] }));
      setSubtasks(activeSubtasks);
    }
    try {
      const result = generateData(parsedConfig, { mode: 'subtask', count: 1, subtasks: activeSubtasks, groupIndex: selectedGroup >= 0 ? selectedGroup : undefined });
      setGenResult(result);
    } catch (e: any) {
      setGenErrors([e.message || '生成失败']);
      setGenResult(null);
    }
    return;
  }

  const n = parseInt(genCountInput, 10);
  const count = isNaN(n) ? 1 : Math.max(1, Math.min(100, n));
  setGenCount(count);
  setGenCountInput(String(count));
  setGenErrors([]);
  try {
    const result = generateData(parsedConfig, { mode: 'simple', count, groupIndex: selectedGroup >= 0 ? selectedGroup : undefined });
    setGenResult(result);
  } catch (e: any) {
    setGenErrors([e.message || '生成失败']);
    setGenResult(null);
  }
};

const handleSave = (data: string, idx: number) => {
  vscode.postMessage({ command: 'saveFile', data, defaultName: `test${idx}.in` });
};

const handleSaveAll = () => {
  if (!genResult || !parsedConfig) return;
  if (genMode === 'subtask' && subtasks.length > 0) {
    const files: { name: string; folder: string; data: string }[] = [];
    let fileIdx = 1;
    for (const st of subtasks) {
      for (let i = 0; i < st.testCount; i++) {
        const data = genResult.cases[fileIdx - 1];
        files.push({ folder: st.name.replace(/\s+/g, '_'), name: `test${fileIdx}.in`, data });
        fileIdx++;
      }
    }
    const configYml = generateConfigYml(parsedConfig, subtasks, selectedGroup >= 0 ? selectedGroup : undefined);
    const readme = generateReadmeContent(parsedConfig, subtasks);
    vscode.postMessage({ command: 'saveAllFiles', files, configYml, readme });
    return;
  }
  const files = genResult.cases.map((data: string, i: number) => ({
    name: `test${i + 1}.in`,
    data,
  }));
  vscode.postMessage({ command: 'saveAllFiles', files });
};

  return (
    <div style={{ padding: '8px' }}>
      <h3>智能数据构造器</h3>
      
      <div style={{ marginBottom: '8px' }}>
        <button onClick={() => setInputMode('paste')} disabled={inputMode === 'paste'}>
          粘贴原文解析
        </button>
        <button onClick={() => setInputMode('form')} disabled={inputMode === 'form'}>
          可视化表单
        </button>
        <button onClick={() => setInputMode('code')} disabled={inputMode === 'code'}>
          规则代码
        </button>
      </div>

      {inputMode === 'paste' && (
        <div>
          <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>快捷输入模板：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {INPUT_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPasteText(tpl.text);
                      const result = parseNaturalLanguage(tpl.text);
                      setParseErrors(result.errors);
                      if (result.errors.length === 0) {
                        setParsedConfig(result);
                        setSelectedGroup(result.constraintGroups.length > 0 ? result.constraintGroups.length - 1 : -1);
                      } else {
                        setParsedConfig(null);
                      }
                    }}
                    title={tpl.description}
                    style={{ fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {tpl.name}
                  </button>
                ))}
                {customTemplates.length > 0 && (
                  <span style={{ color: '#ccc', alignSelf: 'center' }}>|</span>
                )}
                {customTemplates.map((tpl, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setPasteText(tpl.text);
                        const result = parseNaturalLanguage(tpl.text);
                        setParseErrors(result.errors);
                        if (result.errors.length === 0) {
                          setParsedConfig(result);
                          setSelectedGroup(result.constraintGroups.length > 0 ? result.constraintGroups.length - 1 : -1);
                        } else {
                          setParsedConfig(null);
                        }
                      }}
                      title={tpl.description || tpl.text.slice(0, 50)}
                      style={{ fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                      {tpl.name}
                    </button>
                    <button
                      onClick={() => handleDeleteCustomTemplate(i)}
                      title="删除此模板"
                      style={{ fontSize: '10px', padding: '0 3px', marginLeft: '1px', cursor: 'pointer', color: '#c00', border: 'none', background: 'none' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setShowCustomInput(true)}
                  title="将当前输入保存为自定义模板"
                  style={{ fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                >
                  + 自定义
                </button>
                 {showCustomInput && (
                   <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                     <input
                       type="text"
                       value={customInputName}
                       onChange={(e) => setCustomInputName(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTemplate(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomInputName(''); } }}
                       placeholder="模板名称"
                       autoFocus
                       style={{ width: '80px', fontSize: '11px', padding: '1px 4px' }}
                     />
                     <button onClick={handleAddCustomTemplate} style={{ fontSize: '11px', padding: '1px 4px', cursor: 'pointer' }}>确定</button>
                     <button onClick={() => { setShowCustomInput(false); setCustomInputName(''); }} style={{ fontSize: '11px', padding: '1px 4px', cursor: 'pointer' }}>取消</button>
                   </span>
                 )}
              </div>
            </div>
          <textarea
            rows={6}
            style={{ width: '100%', fontFamily: 'monospace' }}
            placeholder={`粘贴题目范围描述，例如：
第一行两个整数 n, m，1 ≤ n ≤ 1000，0 < m ≤ 10^5
接下来 n 行，每行一个整数 a_i ∈ [1, 10^9]`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button onClick={handlePasteParse} style={{ marginTop: '4px' }}>
            解析并预览
          </button>
          {parseErrors.length > 0 && (
            <div style={{ color: 'red', marginTop: '4px' }}>
              {parseErrors.map((err, i) => (
                <div key={i}>⚠️ {err}</div>
              ))}
            </div>
          )}
          {parsedConfig && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => { setGenMode('simple'); setGenResult(null); }}
                  style={{ fontSize: '12px', fontWeight: genMode === 'simple' ? 'bold' : 'normal' }}>简单模式</button>
                <button onClick={() => { setGenMode('subtask'); setGenResult(null); handleTemplateChange(0); }}
                  style={{ fontSize: '12px', fontWeight: genMode === 'subtask' ? 'bold' : 'normal' }}>子任务模式</button>
              </div>

              {genMode === 'simple' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span>生成组数：</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={genCountInput}
                    onChange={(e) => setGenCountInput(e.target.value)}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      const clamped = isNaN(n) ? 1 : Math.max(1, Math.min(100, n));
                      setGenCount(clamped);
                      setGenCountInput(String(clamped));
                    }}
                    style={{ width: '60px' }}
                  />
                  {parsedConfig.constraintGroups.length > 0 && (
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(parseInt(e.target.value, 10))}
                      style={{ fontSize: '13px' }}
                    >
                      {parsedConfig.constraintGroups.map((g, i) => (
                        <option key={i} value={i}>{g.label}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={handleGenerate}>生成数据</button>
                </div>
              )}

              {genMode === 'subtask' && (
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span>预设模板：</span>
                    <select value={selectedTemplate} onChange={(e) => handleTemplateChange(parseInt(e.target.value, 10))} style={{ fontSize: '13px' }}>
                      {PRESET_TEMPLATES.map((t, i) => (
                        <option key={i} value={i}>{t.name}</option>
                      ))}
                    </select>
                    <button onClick={handleGenerate}>生成数据</button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', padding: '4px', background: '#f9f9f9', borderRadius: '4px' }}>
                    {subtasks.map((st, i) => (
                      <span key={i} style={{ marginRight: '12px' }}>{st.name}({st.testCount}组)</span>
                    ))}
                    <span style={{ color: '#999' }}>共 {subtasks.reduce((s, st) => s + st.testCount, 0)} 个测试点</span>
                  </div>
                </div>
              )}
              <details open>
                <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>解析结果</summary>
                <pre style={{ background: '#f0f0f0', padding: '8px', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
                  {JSON.stringify(parsedConfig, null, 2)}
                </pre>
              </details>
            </div>
          )}
          {genErrors.length > 0 && (
            <div style={{ color: 'red', marginTop: '4px' }}>
              {genErrors.map((err, i) => (
                <div key={i}>⚠️ {err}</div>
              ))}
            </div>
          )}
          {genResult && genResult.cases.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <strong>生成结果（{genResult.cases.length} 组）{selectedGroup >= 0 && parsedConfig ? `[${parsedConfig.constraintGroups[selectedGroup]?.label}]` : ''}：</strong>
                {genResult.cases.length > 1 && (
                  <button onClick={handleSaveAll} style={{ fontSize: '12px' }}>保存全部</button>
                )}
              </div>
              {genResult.cases.map((data, idx) => (
                <div key={idx} style={{ marginBottom: '6px', border: '1px solid #ddd', borderRadius: '4px', padding: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '12px', color: '#666' }}>
                    <span>第 {idx + 1} 组</span>
                    <button onClick={() => handleSave(data, idx + 1)} style={{ fontSize: '11px' }}>保存</button>
                  </div>
                  <pre style={{ background: '#f8f8f8', padding: '4px', borderRadius: '2px', overflow: 'auto', fontSize: '12px', margin: 0 }}>
                    {data}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {inputMode === 'form' && (
        <div>
          <p>可视化表单（待实现）</p>
        </div>
      )}

      {inputMode === 'code' && (
        <div>
          <p>规则代码编辑器（待实现）</p>
        </div>
      )}
    </div>
  );
};

export default DataGenPage;
