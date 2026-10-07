module.exports = async function handler(req,res){
  try{
    if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return}
    const type=String(req.query.type||'');
    const base='https://api.coingecko.com/api/v3';
    let url='';
    let cache='public, s-maxage=60, stale-while-revalidate=300';

    if(type==='markets'){
      const ids=String(req.query.ids||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
      if(!ids.length){res.status(400).json({error:'Missing ids'});return}
      url=base+'/coins/markets?vs_currency=eur&ids='+encodeURIComponent(ids.join(','))+'&price_change_percentage=24h';
      cache='public, s-maxage=45, stale-while-revalidate=300';
    }else if(type==='search'){
      const q=String(req.query.q||'').trim().slice(0,80);
      if(q.length<2){res.status(400).json({error:'Query too short'});return}
      url=base+'/search?query='+encodeURIComponent(q);
      cache='public, s-maxage=300, stale-while-revalidate=1800';
    }else if(type==='history'){
      const id=String(req.query.id||'').trim();
      const days=String(req.query.days||'1').trim();
      if(!/^[a-z0-9-]{1,80}$/i.test(id)){res.status(400).json({error:'Invalid id'});return}
      if(!/^(1|7|30|365|max)$/.test(days)){res.status(400).json({error:'Invalid days'});return}
      url=base+'/coins/'+encodeURIComponent(id)+'/market_chart?vs_currency=eur&days='+encodeURIComponent(days);
      cache=days==='1'?'public, s-maxage=60, stale-while-revalidate=300':'public, s-maxage=600, stale-while-revalidate=3600';
    }else{
      res.status(400).json({error:'Unknown type'});return
    }

    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),8000);
    let upstream;
    try{
      upstream=await fetch(url,{
        signal:ctl.signal,
        headers:{
          'accept':'application/json',
          'user-agent':'Liquid-Wealth/1.0'
        }
      });
    }finally{clearTimeout(timer)}

    if(!upstream.ok){
      const body=await upstream.text().catch(()=> '');
      res.status(upstream.status).json({error:'CoinGecko upstream error',status:upstream.status,detail:body.slice(0,300)});
      return
    }

    const data=await upstream.json();
    res.setHeader('Cache-Control',cache);
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.status(200).json(data);
  }catch(err){
    const msg=err&&err.name==='AbortError'?'Upstream timeout':'Proxy error';
    res.status(502).json({error:msg})
  }
};