import { ArrowRight, Check, Clock, Cube, Sparkle } from "@phosphor-icons/react"

type HeroProps = {
  onBrowse: () => void
}

export function Hero({ onBrowse }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <span className="hero__eyebrow">
          <Sparkle size={14} weight="fill" />
          精选应用
        </span>
        <h2 id="hero-title">几分钟内，部署你的下一个服务</h2>
        <p>经过验证的 Docker 应用，一键配置、自动更新，让服务部署更简单。</p>
        <button type="button" onClick={onBrowse}>
          浏览全部应用 <ArrowRight size={17} weight="bold" />
        </button>
      </div>
      <div className="hero__visual" aria-hidden="true">
        <div className="hero__orbit hero__orbit--outer" />
        <div className="hero__orbit hero__orbit--inner" />
        <div className="hero__cube">
          <Cube size={48} weight="duotone" />
        </div>
        <div className="status-card status-card--success">
          <span className="status-card__icon">
            <Check size={14} weight="bold" />
          </span>
          <div>
            <strong>部署成功</strong>
            <span>Uptime Kuma</span>
          </div>
        </div>
        <div className="status-card status-card--update">
          <span className="status-card__icon">
            <Clock size={15} />
          </span>
          <div>
            <strong>自动更新</strong>
            <span>已开启</span>
          </div>
        </div>
      </div>
    </section>
  )
}
