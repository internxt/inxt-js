import { randomBytes } from 'crypto'
import { Mutex } from '../lib/utils/mutex'

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))

const MAX_CONCURRENT_BROWSER_CONNECTIONS = 6

export class ProxyBalancer {
    private proxies: Proxy[];

    constructor() {
        this.proxies = []
    }

    async getProxy(reqsLessThan: number): Promise<Proxy> {
        const proxiesCopy = [...this.proxies]

        let proxiesAvailable

        while((proxiesAvailable = proxiesCopy.filter((proxy) => proxy.requests() < reqsLessThan)).length === 0) {
            await wait(500)
        }

        return proxiesAvailable[0]
    }

    attach(p: Proxy): ProxyBalancer {
        this.proxies.push(p)
        return this
    }

    del(p: Proxy): void {
        this.proxies = this.proxies.filter(proxy => proxy.url !== p.url)
    }
}

export class Proxy {
    public url: string;
    private currentRequests: ProxyRequest[];

    constructor(url: string) {
        this.url = url
        this.currentRequests = []
    }
    
    requests(): number {
        return this.currentRequests.length
    }

    addReq(p: ProxyRequest): void {
        this.currentRequests.push(p)
    }

    removeReq(p: ProxyRequest): void {
        this.currentRequests = this.currentRequests.filter(req => req.id !== p.id)
    }
}

export interface ProxyRequest {
    id: string;
}

interface ProxyManager {
    url: string,
    free: () => void
}

const proxyBalancer = new ProxyBalancer()
    .attach(new Proxy('https://proxy1.internxt.com'))
    .attach(new Proxy('https://proxy2.internxt.com'))
    .attach(new Proxy('https://proxy3.internxt.com'))
    .attach(new Proxy('https://proxy4.internxt.com'))
    .attach(new Proxy('https://proxy5.internxt.com'))


const mutex = new Mutex()

export const getProxy = async (): Promise<ProxyManager> => {
    let response = { ...new Proxy(''), free: () => {null} }

    await mutex.dispatch(async () => {
        const proxy = await proxyBalancer.getProxy(MAX_CONCURRENT_BROWSER_CONNECTIONS)
        const proxyReq = { id: randomBytes(30).toString('hex') }
        proxy.addReq(proxyReq)

        response = { ...proxy, free: () => proxy.removeReq(proxyReq) }
    })

    return response
}

