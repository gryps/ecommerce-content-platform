import { BarChart3, CalendarClock, FileText, RadioTower, Save, Workflow } from "lucide-react";
import type { OperationView, OpsProduct } from "../../types";
import { OPS_GRADE_LABELS, OPS_STATUS_LABELS, useOperationsData, type OpsProductForm } from "./useOperationsData";

function statusLabel(value: string) {
  return OPS_STATUS_LABELS[value] ?? value;
}

function ProductForm({
  form,
  busy,
  selected,
  setForm,
  onNew,
  onSave,
}: {
  form: OpsProductForm;
  busy: boolean;
  selected: OpsProduct | null;
  setForm: (value: OpsProductForm | ((current: OpsProductForm) => OpsProductForm)) => void;
  onNew: () => void;
  onSave: () => void;
}) {
  const tagText = form.style_tags.join("，");
  return <div className="human-card ops-product-editor">
    <div className="human-card-title"><h2>{selected ? "商品档案" : "新增商品"}</h2><span>选品、上架、直播和复盘共用的商品主数据</span></div>
    <div className="ops-product-form">
      <label>商品编号<input value={form.product_code} onChange={event => setForm(current => ({ ...current, product_code: event.target.value }))} placeholder="HZ001" /></label>
      <label>商品名称<input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="珍珠流苏发簪" /></label>
      <label>类目<input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} placeholder="发饰" /></label>
      <label>状态<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}>{Object.entries(OPS_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>测品等级<select value={form.selection_grade} onChange={event => setForm(current => ({ ...current, selection_grade: event.target.value }))}>{OPS_GRADE_LABELS.map(item => <option key={item || "blank"} value={item}>{item || "未定"}</option>)}</select></label>
      <label>负责人<input value={form.owner} onChange={event => setForm(current => ({ ...current, owner: event.target.value }))} placeholder="运营负责人" /></label>
      <label>采购价<input type="number" min="0" step="0.01" value={form.purchase_cost_yuan} onChange={event => setForm(current => ({ ...current, purchase_cost_yuan: Number(event.target.value) }))} /></label>
      <label>建议售价<input type="number" min="0" step="0.01" value={form.target_sale_price_yuan} onChange={event => setForm(current => ({ ...current, target_sale_price_yuan: Number(event.target.value) }))} /></label>
      <label>实际售价<input type="number" min="0" step="0.01" value={form.actual_sale_price_yuan} onChange={event => setForm(current => ({ ...current, actual_sale_price_yuan: Number(event.target.value) }))} /></label>
      <label>现货库存<input type="number" min="0" step="1" value={form.stock_qty} onChange={event => setForm(current => ({ ...current, stock_qty: Number(event.target.value) }))} /></label>
      <label>在途库存<input type="number" min="0" step="1" value={form.inbound_qty} onChange={event => setForm(current => ({ ...current, inbound_qty: Number(event.target.value) }))} /></label>
      <label>采购周期<input type="number" min="0" step="1" value={form.procurement_cycle_days} onChange={event => setForm(current => ({ ...current, procurement_cycle_days: Number(event.target.value) }))} /></label>
      <label className="wide">风格标签<input value={tagText} onChange={event => setForm(current => ({ ...current, style_tags: event.target.value.split(/[，,]/).map(item => item.trim()).filter(Boolean) }))} placeholder="国风，珍珠，日常" /></label>
      <label>供应商<input value={form.supplier_name} onChange={event => setForm(current => ({ ...current, supplier_name: event.target.value }))} placeholder="供应商名称" /></label>
      <label className="span-2">供应商链接<input value={form.supplier_link} onChange={event => setForm(current => ({ ...current, supplier_link: event.target.value }))} placeholder="1688 或证据链接" /></label>
      <label className="wide">备注<textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="质检、退换、禁用表达、样品备注" /></label>
    </div>
    <div className="ops-form-actions"><button type="button" className="human-secondary" onClick={onNew}>新建</button><button type="button" onClick={onSave} disabled={busy}><Save />保存商品</button></div>
  </div>;
}

function ProductsPage({
  products,
  selected,
  selectedId,
  form,
  busy,
  setSelectedId,
  setForm,
  newProduct,
  saveProduct,
}: ReturnType<typeof useOperationsData>) {
  return <div className="ops-workspace">
    <div className="human-card ops-product-table-card">
      <div className="human-card-title"><h2>商品库</h2><span>支持 50 到数百个候选品的主工作区</span></div>
      <div className="image-table-wrap ops-table-wrap">
        <table className="image-ops-table ops-product-table">
          <thead><tr><th>编号</th><th>商品</th><th>状态</th><th>等级</th><th>售价</th><th>采购价</th><th>毛利率</th><th>库存</th><th>负责人</th></tr></thead>
          <tbody>{products.map(product => <tr key={product.id} className={product.id === selectedId ? "active" : ""} onClick={() => setSelectedId(product.id)}>
            <td>{product.product_code}</td><td><b>{product.name}</b><small>{product.category || "未分类"}</small></td><td>{statusLabel(product.status)}</td><td>{product.selection_grade || "未定"}</td><td>{product.actual_sale_price_yuan.toFixed(2)}</td><td>{product.purchase_cost_yuan.toFixed(2)}</td><td>{(product.estimated_gross_margin * 100).toFixed(1)}%</td><td>{product.stock_qty + product.inbound_qty}</td><td>{product.owner || "未分配"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <ProductForm form={form} busy={busy} selected={selected} setForm={setForm} onNew={newProduct} onSave={saveProduct} />
  </div>;
}

function OverviewPage({ data }: { data: ReturnType<typeof useOperationsData> }) {
  const overview = data.overview;
  return <section className="human-page operations-page">
    <div className="human-metrics">{(overview?.metrics ?? []).map(metric => <article key={metric.key}><b>{metric.value}{metric.unit}</b><span>{metric.label}</span></article>)}</div>
    <div className="ops-dashboard-grid">
      <div className="human-card"><div className="human-card-title"><h2>运营闭环</h2><span>商品到复盘的主链路</span></div>
        <div className="human-flow ops-flow">{[
          ["1", "商品库", "候选商品、供应商、价格、库存和状态"],
          ["2", "选品测品", "A/B/C/D 等级和继续测试、清仓、淘汰决策"],
          ["3", "直播排品", "场次商品池、角色、顺序和话术卡"],
          ["4", "投流复盘", "消耗、退款后 ROI、利润和停投建议"],
          ["5", "库存利润", "补货限制、现金测算和亏损预警"],
          ["6", "日报周报", "每日动作、周复盘和阶段复盘"],
        ].map(([number, title, detail]) => <article key={number}><i>{number}</i><div><b>{title}</b><span>{detail}</span></div></article>)}</div>
      </div>
      <div className="human-card"><div className="human-card-title"><h2>风险队列</h2><span>库存和经营异常先进入人工复核</span></div>
        <div className="ops-risk-list">{overview?.risks.length ? overview.risks.map(item => <article key={item.product_id}><b>{item.product_code} · {item.name}</b><span>{item.detail}</span></article>) : <p>暂无库存或人工复核风险</p>}</div>
      </div>
      <div className="human-card"><div className="human-card-title"><h2>下一步动作</h2><span>围绕 90 天起号验证</span></div>
        <div className="ops-action-list">{(overview?.next_actions ?? []).map(item => <article key={item}>{item}</article>)}</div>
      </div>
    </div>
  </section>;
}

const businessTopology = [
  ["市场与竞品观察", "A1 半自动", "竞品、价格、话术和素材进入候选池"],
  ["候选商品池", "A1 半自动", "1688 链接、图片、供应商资料归档"],
  ["供应商与成本核验", "A1 半自动", "核验价格、交期、退换条款和风险"],
  ["选品评分与测品决策", "A1 半自动", "A/B/C/D 等级、毛利和测品建议"],
  ["采购与样品确认", "A2 人工主导", "采购记录、样品质检和预算占用"],
  ["拍摄任务", "A1 半自动", "主图、详情图、短视频和素材重拍"],
  ["商品上架资料包", "A1 半自动", "标题、SKU、卖点、售后说明和素材包"],
  ["抖店人工上架", "A2 人工主导", "人工复制发布、类目资质确认和截图留痕"],
  ["直播排品", "A1 半自动", "商品角色、讲解顺序、库存和测试目标"],
  ["主播话术与场控脚本", "A1 半自动", "30秒/90秒话术、逼单和上链指令"],
  ["直播执行", "A2 人工主导", "现场节奏、主播表现、评论和异常记录"],
  ["投流与自然流量承接", "A1 半自动", "预算建议、ROI 预警和停投建议"],
  ["订单与支付GMV", "A0/A1", "订单导入、支付 GMV 和异常核对"],
  ["发货与物流", "A1 半自动", "发货清单、超时预警和异常件处理"],
  ["退款售后", "A1 半自动", "退款原因归类、高退款预警和客服处理"],
  ["库存与退货二销", "A1/A2", "可售库存、补货建议、二销和报废"],
  ["单品利润与现金流测算", "A0/A1", "退款后净利、投流后利润和现金缺口"],
  ["每日复盘", "A1 半自动", "日报、问题清单、次日动作和责任人"],
] as const;

const decisionLoops = [
  ["继续主推", "回到直播排品，继续排品、投流和补货"],
  ["补货", "回到采购与样品确认，更新供应链和预算"],
  ["换素材", "回到拍摄任务，生成内容优化任务"],
  ["改话术", "回到主播话术与场控脚本，训练后再执行"],
  ["停投/清仓/淘汰", "进入商品退出，停止采购、投流或排品"],
  ["D30/D60/D90项目复盘", "形成阶段经营报告和项目级决策"],
] as const;

const moduleTopology = [
  ["商品中心", "商品主数据", ["供应链中心", "内容任务中心", "上架资料中心", "直播运营中心"]],
  ["内容任务中心", "拍摄与素材", ["直播运营中心"]],
  ["上架资料中心", "标题/SKU/详情", ["店铺运营中心"]],
  ["店铺运营中心", "人工上架与店铺配置", ["直播运营中心"]],
  ["直播运营中心", "场次、排品、话术", ["投流中心", "订单中心"]],
  ["投流中心", "预算、ROI、停投建议", ["订单中心", "利润与现金流中心"]],
  ["订单中心", "订单、支付GMV", ["退款售后中心", "库存中心", "利润与现金流中心"]],
  ["退款售后中心", "原因归类与客服处理", ["库存中心"]],
  ["库存中心", "可售、在途、补货", ["供应链中心", "利润与现金流中心"]],
  ["利润与现金流中心", "单品利润和现金缺口", ["复盘决策中心"]],
  ["复盘决策中心", "日报、周报、阶段复盘", ["商品中心", "内容任务中心", "直播运营中心", "投流中心", "供应链中心", "团队任务中心"]],
] as const;

const automationLevels = [
  ["A0 全自动", "自动计算、自动生成、自动预警", "订单清洗、利润测算、任务逾期提醒"],
  ["A1 半自动", "系统生成建议，人工确认后执行", "选品评分、上架文案、投流建议、复盘初稿"],
  ["A2 人工主导", "系统提供资料和检查清单", "样品采购、质检、直播执行、退货二销"],
  ["A3 禁止自动", "重大风险事项必须负责人确认", "资金、合同、合规、投诉、人员去留"],
] as const;

function TopologyPage() {
  return <section className="human-page operations-page ops-topology-page">
    <div className="ops-topology-header">
      <div><small>来源：commerce-operations-workbench/docs/02_automation_boundary.md</small><h2>运营业务拓扑</h2><p>把直播电商从市场观察到复盘决策的完整链路放在一个页面里，系统只自动生成、计算、预警和留痕，最终发布、投流、采购、资金和合规判断仍由人工确认。</p></div>
      <Workflow />
    </div>
    <div className="human-card ops-topology-card">
      <div className="human-card-title"><h2>总体业务逻辑拓扑</h2><span>市场、商品、内容、直播、投流、订单、库存、利润和复盘的主链路</span></div>
      <div className="ops-chain" aria-label="总体业务逻辑拓扑">
        {businessTopology.map(([title, level, detail], index) => <article key={title}>
          <div className="ops-chain-meta"><i>{String(index + 1).padStart(2, "0")}</i><em className={`ops-auto-level level-${level.slice(0, 2).toLowerCase()}`}>{level}</em></div><b>{title}</b><span>{detail}</span>
        </article>)}
      </div>
      <div className="ops-loop-panel">
        <div><b>每日复盘后的运营决策</b><span>复盘不是终点，所有建议都必须回写到商品、内容、直播、投流、库存和团队任务。</span></div>
        <div className="ops-loop-grid">{decisionLoops.map(([title, detail]) => <article key={title}><b>{title}</b><span>{detail}</span></article>)}</div>
      </div>
    </div>
    <div className="ops-topology-grid">
      <div className="human-card">
        <div className="human-card-title"><h2>系统模块拓扑</h2><span>模块间数据流向和复盘回流关系</span></div>
        <div className="ops-module-map">{moduleTopology.map(([title, detail, targets]) => <article key={title}>
          <div><b>{title}</b><span>{detail}</span></div>
          <p>{targets.join(" / ")}</p>
        </article>)}</div>
      </div>
      <div className="human-card">
        <div className="human-card-title"><h2>自动化边界</h2><span>AI 辅助和人工责任分离</span></div>
        <div className="ops-automation-list">{automationLevels.map(([level, handling, examples]) => <article key={level}>
          <b>{level}</b><span>{handling}</span><small>{examples}</small>
        </article>)}</div>
      </div>
    </div>
  </section>;
}

function PlaceholderPage({ icon: Icon, title, detail }: { icon: typeof BarChart3; title: string; detail: string }) {
  return <section className="human-page operations-page"><div className="human-card ops-placeholder"><Icon /><b>{title}</b><span>{detail}</span></div></section>;
}

export function OperationsCenter({ view, onError, onNotice }: { view: OperationView; onError: (value: string) => void; onNotice: (value: string) => void }) {
  const data = useOperationsData({ onError, onNotice });
  if (view === "overview") return <OverviewPage data={data} />;
  if (view === "topology") return <TopologyPage />;
  if (view === "products") return <section className="human-page operations-page"><ProductsPage {...data} /></section>;
  if (view === "live") return <PlaceholderPage icon={CalendarClock} title="直播运营" detail="下一步接入直播场次、排品表、话术卡和下播数据录入。" />;
  if (view === "ads") return <PlaceholderPage icon={RadioTower} title="投流复盘" detail="下一步接入投流计划、退款后 ROI、投流后利润和停投建议。" />;
  if (view === "finance") return <PlaceholderPage icon={BarChart3} title="库存利润" detail="下一步接入库存预警、补货限制、单品利润和现金流测算。" />;
  return <PlaceholderPage icon={FileText} title="日报周报" detail="下一步接入每日经营复盘、周复盘和 D30/D60/D90 阶段报告。" />;
}
