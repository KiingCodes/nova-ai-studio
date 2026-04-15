export type TemplateType = 'saas' | 'agency' | 'landing' | 'dashboard' | 'booking';

export interface GeneratedProject {
  id: string;
  name: string;
  template: TemplateType;
  prompt: string;
  html: string;
  timestamp: number;
}

const detectTemplate = (prompt: string): TemplateType => {
  const p = prompt.toLowerCase();
  if (p.includes('dashboard') || p.includes('admin') || p.includes('analytics') || p.includes('app')) return 'dashboard';
  if (p.includes('booking') || p.includes('appointment') || p.includes('calendar') || p.includes('schedule')) return 'booking';
  if (p.includes('agency') || p.includes('corporate') || p.includes('studio') || p.includes('firm')) return 'agency';
  if (p.includes('landing') || p.includes('conversion') || p.includes('waitlist') || p.includes('launch')) return 'landing';
  return 'saas';
};

const extractBrand = (prompt: string): { name: string; tagline: string } => {
  const words = prompt.split(' ').filter(w => w.length > 3);
  const name = words.find(w => w[0] === w[0].toUpperCase()) || 'Nexus';
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    tagline: prompt.length > 40 ? prompt.slice(0, 60) + '...' : prompt,
  };
};

const saasTemplate = (brand: { name: string; tagline: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#fafafa;color:#0f172a;line-height:1.6}
.container{max-width:1200px;margin:0 auto;padding:0 24px}
nav{padding:20px 0;display:flex;align-items:center;justify-content:space-between}
nav .logo{font-weight:800;font-size:1.5rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
nav ul{display:flex;gap:32px;list-style:none}
nav a{text-decoration:none;color:#64748b;font-weight:500;font-size:0.9rem;transition:color 0.2s}
nav a:hover{color:#0f172a}
.hero{padding:120px 0 80px;text-align:center}
.hero .badge{display:inline-block;padding:6px 16px;border-radius:50px;font-size:0.8rem;font-weight:600;background:#ede9fe;color:#7c3aed;margin-bottom:24px}
.hero h1{font-size:4rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:24px;max-width:800px;margin-left:auto;margin-right:auto}
.hero p{font-size:1.2rem;color:#64748b;max-width:560px;margin:0 auto 40px}
.hero .ctas{display:flex;gap:16px;justify-content:center}
.btn{padding:14px 32px;border-radius:12px;font-weight:600;font-size:0.95rem;text-decoration:none;transition:all 0.2s;display:inline-block;cursor:pointer;border:none}
.btn-primary{background:#0f172a;color:#fff}
.btn-primary:hover{background:#1e293b;transform:translateY(-1px);box-shadow:0 8px 30px rgba(15,23,42,0.2)}
.btn-secondary{background:#fff;color:#0f172a;border:1.5px solid #e2e8f0}
.btn-secondary:hover{border-color:#0f172a}
.features{padding:80px 0}
.features h2{font-size:2.5rem;font-weight:800;text-align:center;margin-bottom:16px;letter-spacing:-0.02em}
.features .sub{text-align:center;color:#64748b;margin-bottom:60px;font-size:1.1rem}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.feature-card{padding:36px;border-radius:16px;background:#fff;border:1px solid #f1f5f9;transition:all 0.3s}
.feature-card:hover{border-color:#e2e8f0;box-shadow:0 12px 40px rgba(0,0,0,0.06);transform:translateY(-4px)}
.feature-card .icon{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:1.3rem}
.feature-card h3{font-size:1.15rem;font-weight:700;margin-bottom:8px}
.feature-card p{color:#64748b;font-size:0.93rem;line-height:1.7}
.pricing{padding:80px 0;background:#fff;border-top:1px solid #f1f5f9}
.pricing h2{font-size:2.5rem;font-weight:800;text-align:center;margin-bottom:60px;letter-spacing:-0.02em}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:960px;margin:0 auto}
.price-card{padding:36px;border-radius:16px;border:1.5px solid #f1f5f9;transition:all 0.3s}
.price-card.popular{border-color:#6366f1;position:relative;box-shadow:0 8px 30px rgba(99,102,241,0.12)}
.price-card .tier{font-size:0.85rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.price-card .amount{font-size:3rem;font-weight:800;margin-bottom:4px}
.price-card .period{color:#94a3b8;font-size:0.9rem;margin-bottom:24px}
.price-card ul{list-style:none;margin-bottom:32px}
.price-card li{padding:8px 0;font-size:0.93rem;color:#475569}
.price-card li::before{content:"✓ ";color:#22c55e;font-weight:700}
.testimonials{padding:80px 0}
.testimonials h2{font-size:2.5rem;font-weight:800;text-align:center;margin-bottom:60px}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.testimonial{padding:32px;border-radius:16px;background:#fff;border:1px solid #f1f5f9}
.testimonial p{font-size:0.95rem;color:#475569;margin-bottom:20px;line-height:1.7;font-style:italic}
.testimonial .author{display:flex;align-items:center;gap:12px}
.testimonial .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6)}
.testimonial .name{font-weight:600;font-size:0.9rem}
.testimonial .role{color:#94a3b8;font-size:0.8rem}
footer{padding:48px 0;border-top:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:0.85rem}
@media(max-width:768px){
  .hero h1{font-size:2.5rem}
  .features-grid,.pricing-grid,.testimonials-grid{grid-template-columns:1fr}
  .hero .ctas{flex-direction:column;align-items:center}
}
</style>
</head>
<body>
<div class="container">
<nav>
<div class="logo">${brand.name}</div>
<ul><li><a href="#">Features</a></li><li><a href="#">Pricing</a></li><li><a href="#">About</a></li><li><a href="#" class="btn btn-primary" style="padding:10px 24px;font-size:0.85rem">Get Started</a></li></ul>
</nav>
<section class="hero">
<div class="badge">🚀 Now in Public Beta</div>
<h1>Build faster with ${brand.name}</h1>
<p>The modern platform that helps teams ship beautiful products at unprecedented speed. No complexity, just results.</p>
<div class="ctas">
<a href="#" class="btn btn-primary">Start Free Trial</a>
<a href="#" class="btn btn-secondary">Watch Demo →</a>
</div>
</section>
</div>
<div class="container">
<section class="features">
<h2>Everything you need</h2>
<p class="sub">Powerful features designed for modern teams</p>
<div class="features-grid">
<div class="feature-card"><div class="icon">⚡</div><h3>Lightning Fast</h3><p>Optimized performance with sub-50ms response times. Your users will love the speed.</p></div>
<div class="feature-card"><div class="icon">🔒</div><h3>Enterprise Security</h3><p>SOC 2 compliant with end-to-end encryption. Your data is always protected.</p></div>
<div class="feature-card"><div class="icon">📊</div><h3>Advanced Analytics</h3><p>Real-time insights and custom dashboards to track every metric that matters.</p></div>
<div class="feature-card"><div class="icon">🔗</div><h3>Seamless Integrations</h3><p>Connect with 200+ tools including Slack, GitHub, Jira, and more.</p></div>
<div class="feature-card"><div class="icon">🤖</div><h3>AI-Powered</h3><p>Intelligent automation that learns from your workflow and suggests improvements.</p></div>
<div class="feature-card"><div class="icon">🌍</div><h3>Global Scale</h3><p>Deploy to 30+ regions worldwide with automatic failover and CDN.</p></div>
</div>
</section>
</div>
<section class="pricing">
<div class="container">
<h2>Simple, transparent pricing</h2>
<div class="pricing-grid">
<div class="price-card"><div class="tier">Starter</div><div class="amount">$0</div><div class="period">Free forever</div><ul><li>Up to 3 projects</li><li>1GB storage</li><li>Community support</li><li>Basic analytics</li></ul><a href="#" class="btn btn-secondary" style="width:100%;text-align:center">Get Started</a></div>
<div class="price-card popular"><div class="tier">Pro</div><div class="amount">$29</div><div class="period">per month, billed annually</div><ul><li>Unlimited projects</li><li>100GB storage</li><li>Priority support</li><li>Advanced analytics</li><li>Custom domains</li></ul><a href="#" class="btn btn-primary" style="width:100%;text-align:center">Start Free Trial</a></div>
<div class="price-card"><div class="tier">Enterprise</div><div class="amount">Custom</div><div class="period">tailored to your needs</div><ul><li>Everything in Pro</li><li>Unlimited storage</li><li>Dedicated support</li><li>SLA guarantee</li><li>SSO & SAML</li></ul><a href="#" class="btn btn-secondary" style="width:100%;text-align:center">Contact Sales</a></div>
</div>
</div>
</section>
<div class="container">
<section class="testimonials">
<h2>Loved by thousands</h2>
<div class="testimonials-grid">
<div class="testimonial"><p>"${brand.name} completely transformed how our team works. We shipped 3x faster in the first month."</p><div class="author"><div class="avatar"></div><div><div class="name">Sarah Chen</div><div class="role">CTO, TechCorp</div></div></div></div>
<div class="testimonial"><p>"The best tool we've adopted this year. Clean, fast, and the team absolutely loves it."</p><div class="author"><div class="avatar"></div><div><div class="name">Marcus Rivera</div><div class="role">VP Engineering, ScaleUp</div></div></div></div>
<div class="testimonial"><p>"Finally, a platform that just works. No setup headaches, no compromises on quality."</p><div class="author"><div class="avatar"></div><div><div class="name">Emily Park</div><div class="role">Product Lead, InnovateCo</div></div></div></div>
</div>
</section>
</div>
<footer><div class="container">© 2025 ${brand.name}. All rights reserved. Built with ❤️ for modern teams.</div></footer>
</body>
</html>`;

const agencyTemplate = (brand: { name: string; tagline: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name} — Premium Agency</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0a0a0a;color:#fafafa;line-height:1.6}
.container{max-width:1200px;margin:0 auto;padding:0 24px}
nav{padding:24px 0;display:flex;align-items:center;justify-content:space-between}
nav .logo{font-weight:900;font-size:1.5rem;letter-spacing:-0.03em}
nav ul{display:flex;gap:32px;list-style:none}
nav a{text-decoration:none;color:#a1a1aa;font-weight:500;font-size:0.9rem;transition:color 0.2s}
nav a:hover{color:#fff}
.hero{padding:140px 0 100px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;background:radial-gradient(circle,rgba(99,102,241,0.08),transparent);transform:translate(-50%,-50%);border-radius:50%}
.hero .overline{font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:#6366f1;margin-bottom:24px}
.hero h1{font-size:5rem;font-weight:900;letter-spacing:-0.04em;line-height:1;margin-bottom:32px}
.hero h1 span{background:linear-gradient(135deg,#6366f1,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.25rem;color:#a1a1aa;max-width:540px;margin-bottom:48px;line-height:1.7}
.btn{padding:16px 36px;border-radius:12px;font-weight:600;font-size:0.95rem;text-decoration:none;transition:all 0.3s;display:inline-block;border:none;cursor:pointer}
.btn-glow{background:#6366f1;color:#fff;box-shadow:0 0 30px rgba(99,102,241,0.3)}
.btn-glow:hover{box-shadow:0 0 50px rgba(99,102,241,0.5);transform:translateY(-2px)}
.btn-outline{border:1.5px solid #27272a;color:#fafafa;background:transparent}
.btn-outline:hover{border-color:#6366f1}
.services{padding:100px 0}
.services h2{font-size:2.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:60px}
.services-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.service{padding:48px;border-radius:20px;border:1px solid #1a1a1e;background:linear-gradient(135deg,#111114,#0d0d10);transition:all 0.4s}
.service:hover{border-color:#27272a;transform:translateY(-4px)}
.service .num{font-size:3rem;font-weight:900;color:#27272a;margin-bottom:16px}
.service h3{font-size:1.4rem;font-weight:700;margin-bottom:12px}
.service p{color:#71717a;font-size:0.95rem;line-height:1.7}
.cases{padding:100px 0}
.cases h2{font-size:2.5rem;font-weight:800;margin-bottom:60px}
.cases-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.case{border-radius:20px;overflow:hidden;aspect-ratio:4/3;background:linear-gradient(135deg,#18181b,#27272a);position:relative;transition:transform 0.4s}
.case:hover{transform:scale(1.02)}
.case .overlay{position:absolute;bottom:0;left:0;right:0;padding:24px;background:linear-gradient(transparent,rgba(0,0,0,0.9))}
.case h3{font-weight:700;font-size:1rem}
.case span{color:#71717a;font-size:0.8rem}
.cta{padding:100px 0;text-align:center}
.cta h2{font-size:3.5rem;font-weight:900;margin-bottom:20px;letter-spacing:-0.03em}
.cta p{color:#71717a;font-size:1.1rem;margin-bottom:40px}
footer{padding:48px 0;border-top:1px solid #18181b;text-align:center;color:#52525b;font-size:0.85rem}
@media(max-width:768px){.hero h1{font-size:3rem}.services-grid,.cases-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
<nav><div class="logo">${brand.name}®</div><ul><li><a href="#">Work</a></li><li><a href="#">Services</a></li><li><a href="#">About</a></li><li><a href="#" class="btn btn-glow" style="padding:10px 24px;font-size:0.85rem">Contact</a></li></ul></nav>
<section class="hero">
<div class="overline">Digital Excellence</div>
<h1>We craft<br><span>digital experiences</span></h1>
<p>Award-winning design studio specializing in brand identity, web experiences, and digital products that drive results.</p>
<div style="display:flex;gap:16px"><a href="#" class="btn btn-glow">Start a Project</a><a href="#" class="btn btn-outline">View Our Work →</a></div>
</section>
<section class="services">
<h2>What we do</h2>
<div class="services-grid">
<div class="service"><div class="num">01</div><h3>Brand Strategy</h3><p>We build brands that resonate. From positioning to visual identity, we create cohesive brand systems that stand out.</p></div>
<div class="service"><div class="num">02</div><h3>Web Design & Development</h3><p>Beautiful, performant websites that convert. We combine stunning design with cutting-edge technology.</p></div>
<div class="service"><div class="num">03</div><h3>Product Design</h3><p>User-centered product experiences that delight. From concept to launch, we handle the full design lifecycle.</p></div>
<div class="service"><div class="num">04</div><h3>Growth Marketing</h3><p>Data-driven strategies that scale. We help brands reach their audience with precision and creativity.</p></div>
</div>
</section>
<section class="cases">
<h2>Selected work</h2>
<div class="cases-grid">
<div class="case"><div class="overlay"><h3>Finova Banking</h3><span>Brand / Web / Product</span></div></div>
<div class="case"><div class="overlay"><h3>Aether Wellness</h3><span>Brand / Web</span></div></div>
<div class="case"><div class="overlay"><h3>Vertex Analytics</h3><span>Product / Web</span></div></div>
</div>
</section>
<section class="cta">
<h2>Let's create together</h2>
<p>Ready to elevate your digital presence? Let's talk.</p>
<a href="#" class="btn btn-glow">Get in Touch</a>
</section>
</div>
<footer><div class="container">© 2025 ${brand.name}. All rights reserved.</div></footer>
</body>
</html>`;

const landingTemplate = (brand: { name: string; tagline: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name} — Join the Waitlist</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a}
.container{max-width:720px;margin:0 auto;padding:0 24px}
nav{max-width:1200px;margin:0 auto;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
nav .logo{font-weight:800;font-size:1.4rem}
.hero{padding:120px 0 60px;text-align:center}
.hero .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:50px;background:#fef3c7;font-size:0.8rem;font-weight:600;color:#92400e;margin-bottom:28px}
.hero h1{font-size:4.5rem;font-weight:900;letter-spacing:-0.04em;line-height:1.05;margin-bottom:28px}
.hero p{font-size:1.2rem;color:#64748b;line-height:1.7;margin-bottom:40px}
.email-form{display:flex;gap:12px;max-width:480px;margin:0 auto 24px}
.email-form input{flex:1;padding:16px 20px;border:2px solid #e2e8f0;border-radius:14px;font-size:1rem;outline:none;transition:border 0.2s;font-family:inherit}
.email-form input:focus{border-color:#0f172a}
.email-form button{padding:16px 32px;border-radius:14px;background:#0f172a;color:#fff;border:none;font-weight:700;font-size:0.95rem;cursor:pointer;transition:all 0.2s;white-space:nowrap}
.email-form button:hover{background:#1e293b;transform:translateY(-1px);box-shadow:0 8px 24px rgba(15,23,42,0.2)}
.social-proof{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:80px}
.avatars{display:flex}
.avatars div{width:36px;height:36px;border-radius:50%;border:2px solid #fff;margin-left:-10px;background:linear-gradient(135deg,#6366f1,#a78bfa)}
.avatars div:first-child{margin-left:0}
.social-proof span{color:#64748b;font-size:0.9rem;font-weight:500}
.logos{padding:60px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9}
.logos p{text-align:center;font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:32px}
.logos-row{display:flex;justify-content:center;gap:48px;align-items:center;opacity:0.4}
.logos-row span{font-size:1.3rem;font-weight:800;color:#0f172a}
.benefits{padding:80px 0}
.benefits h2{text-align:center;font-size:2.5rem;font-weight:800;margin-bottom:60px;letter-spacing:-0.02em}
.benefits-list{display:flex;flex-direction:column;gap:48px}
.benefit{display:flex;gap:24px;align-items:flex-start}
.benefit .num{width:48px;height:48px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-weight:800;color:#6366f1;flex-shrink:0}
.benefit h3{font-size:1.15rem;font-weight:700;margin-bottom:4px}
.benefit p{color:#64748b;font-size:0.95rem;line-height:1.7}
.final-cta{padding:80px 0;text-align:center;background:#f8fafc;border-radius:24px;margin:40px 24px}
.final-cta h2{font-size:2.5rem;font-weight:900;margin-bottom:16px}
.final-cta p{color:#64748b;margin-bottom:32px;font-size:1.05rem}
footer{padding:48px 0;text-align:center;color:#94a3b8;font-size:0.85rem}
@media(max-width:768px){.hero h1{font-size:2.8rem}.email-form{flex-direction:column}}
</style>
</head>
<body>
<nav><div class="logo">${brand.name}</div><a href="#" style="text-decoration:none;padding:10px 24px;border-radius:10px;background:#0f172a;color:#fff;font-weight:600;font-size:0.85rem">Join Waitlist</a></nav>
<div class="container">
<section class="hero">
<div class="pill">✨ Early Access Now Open</div>
<h1>The future of ${brand.name.toLowerCase()} starts here</h1>
<p>Join thousands of forward-thinking teams already on the waitlist. Be the first to experience what's next.</p>
<div class="email-form"><input type="email" placeholder="Enter your email"><button>Join Waitlist</button></div>
<div class="social-proof"><div class="avatars"><div></div><div></div><div></div><div></div></div><span>2,847 people already joined</span></div>
</section>
</div>
<section class="logos"><div class="container"><p>Trusted by teams at</p><div class="logos-row"><span>Acme</span><span>Globex</span><span>Soylent</span><span>Initech</span><span>Umbrella</span></div></div></section>
<div class="container">
<section class="benefits">
<h2>Why ${brand.name}?</h2>
<div class="benefits-list">
<div class="benefit"><div class="num">1</div><div><h3>10x faster workflow</h3><p>Eliminate repetitive tasks and focus on what matters. Our intelligent automation handles the rest.</p></div></div>
<div class="benefit"><div class="num">2</div><div><h3>Built for collaboration</h3><p>Real-time collaboration that feels natural. Work together seamlessly, regardless of location.</p></div></div>
<div class="benefit"><div class="num">3</div><div><h3>Enterprise-grade security</h3><p>Your data is protected with bank-level encryption. SOC 2 Type II certified from day one.</p></div></div>
</div>
</section>
</div>
<section class="final-cta"><h2>Ready to get started?</h2><p>Join the waitlist and be first in line.</p><a href="#" style="display:inline-block;padding:16px 36px;border-radius:14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;font-size:1rem">Join the Waitlist →</a></section>
<footer>© 2025 ${brand.name}. All rights reserved.</footer>
</body>
</html>`;

const dashboardTemplate = (brand: { name: string; tagline: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name} Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh}
.sidebar{width:260px;background:#fff;border-right:1px solid #e2e8f0;padding:24px;display:flex;flex-direction:column}
.sidebar .logo{font-weight:800;font-size:1.3rem;margin-bottom:36px;padding:0 8px}
.sidebar nav{display:flex;flex-direction:column;gap:4px;flex:1}
.sidebar a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;text-decoration:none;color:#64748b;font-weight:500;font-size:0.9rem;transition:all 0.2s}
.sidebar a:hover{background:#f1f5f9;color:#0f172a}
.sidebar a.active{background:#f1f5f9;color:#0f172a;font-weight:600}
.main{flex:1;padding:32px;overflow:auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px}
.header h1{font-size:1.5rem;font-weight:700}
.header .actions{display:flex;gap:12px}
.header button{padding:10px 20px;border-radius:10px;border:none;font-weight:600;font-size:0.85rem;cursor:pointer;font-family:inherit}
.header .btn-p{background:#0f172a;color:#fff}
.header .btn-s{background:#fff;border:1.5px solid #e2e8f0;color:#0f172a}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:32px}
.stat{padding:24px;background:#fff;border-radius:16px;border:1px solid #f1f5f9}
.stat .label{font-size:0.8rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.stat .value{font-size:2rem;font-weight:800;letter-spacing:-0.02em}
.stat .change{font-size:0.8rem;font-weight:600;margin-top:4px}
.stat .up{color:#22c55e}
.stat .down{color:#ef4444}
.chart-area{background:#fff;border-radius:16px;border:1px solid #f1f5f9;padding:24px;margin-bottom:24px}
.chart-area h3{font-size:1rem;font-weight:600;margin-bottom:20px}
.chart-placeholder{height:240px;background:linear-gradient(180deg,#ede9fe 0%,#f8fafc 100%);border-radius:12px;display:flex;align-items:flex-end;padding:20px;gap:8px}
.bar{flex:1;background:linear-gradient(180deg,#6366f1,#818cf8);border-radius:6px 6px 0 0;transition:height 0.3s}
.table-area{background:#fff;border-radius:16px;border:1px solid #f1f5f9;overflow:hidden}
.table-area h3{font-size:1rem;font-weight:600;padding:24px 24px 16px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 24px;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:1px solid #f1f5f9}
td{padding:16px 24px;font-size:0.9rem;border-bottom:1px solid #f8fafc}
.badge{padding:4px 10px;border-radius:50px;font-size:0.75rem;font-weight:600}
.badge-green{background:#dcfce7;color:#16a34a}
.badge-yellow{background:#fef9c3;color:#a16207}
.badge-red{background:#fee2e2;color:#dc2626}
@media(max-width:768px){body{flex-direction:column}.sidebar{width:100%;flex-direction:row;padding:12px;overflow-x:auto}.sidebar nav{flex-direction:row}.stats{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="sidebar">
<div class="logo">${brand.name}</div>
<nav>
<a href="#" class="active">📊 Dashboard</a>
<a href="#">👥 Customers</a>
<a href="#">📦 Products</a>
<a href="#">💳 Billing</a>
<a href="#">📈 Analytics</a>
<a href="#">⚙️ Settings</a>
</nav>
</div>
<div class="main">
<div class="header"><h1>Dashboard</h1><div class="actions"><button class="btn-s">Export</button><button class="btn-p">+ New Report</button></div></div>
<div class="stats">
<div class="stat"><div class="label">Revenue</div><div class="value">$48.2K</div><div class="change up">↑ 12.5%</div></div>
<div class="stat"><div class="label">Users</div><div class="value">2,847</div><div class="change up">↑ 8.2%</div></div>
<div class="stat"><div class="label">Orders</div><div class="value">1,234</div><div class="change up">↑ 4.1%</div></div>
<div class="stat"><div class="label">Churn Rate</div><div class="value">2.4%</div><div class="change down">↑ 0.3%</div></div>
</div>
<div class="chart-area"><h3>Revenue Overview</h3><div class="chart-placeholder"><div class="bar" style="height:60%"></div><div class="bar" style="height:45%"></div><div class="bar" style="height:75%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:85%"></div><div class="bar" style="height:65%"></div><div class="bar" style="height:90%"></div><div class="bar" style="height:70%"></div><div class="bar" style="height:80%"></div><div class="bar" style="height:60%"></div><div class="bar" style="height:95%"></div><div class="bar" style="height:75%"></div></div></div>
<div class="table-area"><h3>Recent Orders</h3>
<table><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
<tbody>
<tr><td>#ORD-7291</td><td>Sarah Johnson</td><td>$249.00</td><td><span class="badge badge-green">Completed</span></td><td>Jan 15, 2025</td></tr>
<tr><td>#ORD-7290</td><td>Michael Chen</td><td>$189.00</td><td><span class="badge badge-yellow">Processing</span></td><td>Jan 15, 2025</td></tr>
<tr><td>#ORD-7289</td><td>Emma Wilson</td><td>$529.00</td><td><span class="badge badge-green">Completed</span></td><td>Jan 14, 2025</td></tr>
<tr><td>#ORD-7288</td><td>David Park</td><td>$99.00</td><td><span class="badge badge-red">Refunded</span></td><td>Jan 14, 2025</td></tr>
<tr><td>#ORD-7287</td><td>Lisa Anderson</td><td>$349.00</td><td><span class="badge badge-green">Completed</span></td><td>Jan 13, 2025</td></tr>
</tbody></table></div>
</div>
</body>
</html>`;

const bookingTemplate = (brand: { name: string; tagline: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name} — Book Now</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fafafa;color:#0f172a}
.container{max-width:1200px;margin:0 auto;padding:0 24px}
nav{padding:20px 0;display:flex;align-items:center;justify-content:space-between}
nav .logo{font-weight:800;font-size:1.4rem}
nav ul{display:flex;gap:28px;list-style:none}
nav a{text-decoration:none;color:#64748b;font-weight:500;font-size:0.9rem}
.hero{padding:80px 0 60px;text-align:center}
.hero h1{font-size:3.5rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:16px}
.hero p{color:#64748b;font-size:1.15rem;margin-bottom:40px}
.booking-section{padding:40px 0 80px}
.booking-grid{display:grid;grid-template-columns:1fr 400px;gap:40px}
.services h3{font-size:1.3rem;font-weight:700;margin-bottom:24px}
.service-list{display:flex;flex-direction:column;gap:12px}
.service-item{padding:20px 24px;border-radius:14px;background:#fff;border:2px solid #f1f5f9;cursor:pointer;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center}
.service-item:hover{border-color:#6366f1;transform:translateY(-1px)}
.service-item.selected{border-color:#6366f1;background:#faf5ff}
.service-item h4{font-weight:600;margin-bottom:2px}
.service-item .meta{font-size:0.85rem;color:#94a3b8}
.service-item .price{font-size:1.2rem;font-weight:700;color:#6366f1}
.booking-panel{background:#fff;border-radius:20px;border:1px solid #f1f5f9;padding:32px;height:fit-content;position:sticky;top:32px}
.booking-panel h3{font-size:1.1rem;font-weight:700;margin-bottom:24px}
.calendar{margin-bottom:24px}
.cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.cal-header span{font-weight:600}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}
.cal-grid .day-name{font-size:0.7rem;font-weight:600;color:#94a3b8;padding:8px 0}
.cal-grid .day{padding:10px;border-radius:10px;font-size:0.85rem;cursor:pointer;transition:all 0.2s;font-weight:500}
.cal-grid .day:hover{background:#f1f5f9}
.cal-grid .day.selected{background:#6366f1;color:#fff}
.cal-grid .day.disabled{color:#d4d4d8;cursor:default}
.time-slots{margin-bottom:24px}
.time-slots h4{font-size:0.85rem;font-weight:600;color:#64748b;margin-bottom:12px}
.slots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.slot{padding:10px;text-align:center;border-radius:10px;border:1.5px solid #e2e8f0;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.2s}
.slot:hover{border-color:#6366f1}
.slot.selected{background:#6366f1;color:#fff;border-color:#6366f1}
.book-btn{width:100%;padding:16px;border-radius:14px;background:#0f172a;color:#fff;border:none;font-weight:700;font-size:1rem;cursor:pointer;transition:all 0.2s;font-family:inherit}
.book-btn:hover{background:#1e293b;transform:translateY(-1px);box-shadow:0 8px 24px rgba(15,23,42,0.2)}
.reviews{padding:80px 0;border-top:1px solid #f1f5f9}
.reviews h2{font-size:2rem;font-weight:800;text-align:center;margin-bottom:48px}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.review{padding:28px;border-radius:16px;background:#fff;border:1px solid #f1f5f9}
.stars{color:#f59e0b;margin-bottom:12px;letter-spacing:2px}
.review p{font-size:0.9rem;color:#475569;line-height:1.7;margin-bottom:16px}
.review .author{font-weight:600;font-size:0.85rem}
footer{padding:48px 0;text-align:center;color:#94a3b8;font-size:0.85rem;border-top:1px solid #f1f5f9}
@media(max-width:768px){.booking-grid{grid-template-columns:1fr}.reviews-grid{grid-template-columns:1fr}.hero h1{font-size:2.5rem}}
</style>
</head>
<body>
<div class="container">
<nav><div class="logo">${brand.name}</div><ul><li><a href="#">Services</a></li><li><a href="#">About</a></li><li><a href="#">Reviews</a></li><li><a href="#" style="padding:10px 20px;border-radius:10px;background:#0f172a;color:#fff;font-weight:600">Book Now</a></li></ul></nav>
<section class="hero"><h1>Book your session</h1><p>Select a service and choose a time that works for you.</p></section>
<section class="booking-section">
<div class="booking-grid">
<div class="services"><h3>Select a service</h3>
<div class="service-list">
<div class="service-item selected"><div><h4>Consultation</h4><div class="meta">30 min</div></div><div class="price">$49</div></div>
<div class="service-item"><div><h4>Standard Session</h4><div class="meta">60 min</div></div><div class="price">$99</div></div>
<div class="service-item"><div><h4>Premium Package</h4><div class="meta">90 min</div></div><div class="price">$179</div></div>
<div class="service-item"><div><h4>VIP Experience</h4><div class="meta">120 min</div></div><div class="price">$299</div></div>
</div></div>
<div class="booking-panel"><h3>Select date & time</h3>
<div class="calendar"><div class="cal-header"><span>← January 2025 →</span></div>
<div class="cal-grid">
<div class="day-name">Mo</div><div class="day-name">Tu</div><div class="day-name">We</div><div class="day-name">Th</div><div class="day-name">Fr</div><div class="day-name">Sa</div><div class="day-name">Su</div>
<div class="day disabled"></div><div class="day disabled"></div><div class="day">1</div><div class="day">2</div><div class="day">3</div><div class="day">4</div><div class="day">5</div>
<div class="day">6</div><div class="day">7</div><div class="day">8</div><div class="day">9</div><div class="day">10</div><div class="day">11</div><div class="day">12</div>
<div class="day">13</div><div class="day">14</div><div class="day selected">15</div><div class="day">16</div><div class="day">17</div><div class="day">18</div><div class="day">19</div>
<div class="day">20</div><div class="day">21</div><div class="day">22</div><div class="day">23</div><div class="day">24</div><div class="day">25</div><div class="day">26</div>
<div class="day">27</div><div class="day">28</div><div class="day">29</div><div class="day">30</div><div class="day">31</div>
</div></div>
<div class="time-slots"><h4>Available times</h4>
<div class="slots">
<div class="slot">9:00 AM</div><div class="slot selected">10:00 AM</div><div class="slot">11:00 AM</div>
<div class="slot">1:00 PM</div><div class="slot">2:00 PM</div><div class="slot">3:00 PM</div>
</div></div>
<button class="book-btn">Confirm Booking — $49</button>
</div>
</div>
</section>
<section class="reviews"><h2>What our clients say</h2>
<div class="reviews-grid">
<div class="review"><div class="stars">★★★★★</div><p>"Absolutely incredible experience. Professional, punctual, and exceeded all my expectations."</p><div class="author">— Jessica M.</div></div>
<div class="review"><div class="stars">★★★★★</div><p>"The booking process was so smooth. I was in and out with exactly what I needed. Highly recommend!"</p><div class="author">— Robert K.</div></div>
<div class="review"><div class="stars">★★★★★</div><p>"Best service in the city. The VIP package is worth every penny. Will definitely be coming back."</p><div class="author">— Amanda L.</div></div>
</div></section>
</div>
<footer>© 2025 ${brand.name}. All rights reserved.</footer>
</body>
</html>`;

export const generateProject = (prompt: string): GeneratedProject => {
  const template = detectTemplate(prompt);
  const brand = extractBrand(prompt);
  
  const generators: Record<TemplateType, (b: typeof brand) => string> = {
    saas: saasTemplate,
    agency: agencyTemplate,
    landing: landingTemplate,
    dashboard: dashboardTemplate,
    booking: bookingTemplate,
  };

  return {
    id: crypto.randomUUID(),
    name: brand.name,
    template,
    prompt,
    html: generators[template](brand),
    timestamp: Date.now(),
  };
};

export const templateLabels: Record<TemplateType, string> = {
  saas: 'SaaS Startup',
  agency: 'Agency / Corporate',
  landing: 'Landing Page',
  dashboard: 'Dashboard App',
  booking: 'Booking / Service',
};
