# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ficosha/hu-arq-001.spec.ts >> HU-ARQ-001 — Arquitectura SSR / Microfrontends @ficosha >> TC-ARQ-001-04: Sin errores críticos de consola en carga inicial (CA-RN02-01 / RN-02)
- Location: e2e/ficosha/hu-arq-001.spec.ts:152:3

# Error details

```
Error: Errores críticos de consola detectados: The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy. | Cannot read properties of null (reading 'getAttribute') | Cannot read properties of undefined (reading 'addEventListener')

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 3
Received array:  ["The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy.", "Cannot read properties of null (reading 'getAttribute')", "Cannot read properties of undefined (reading 'addEventListener')"]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic:
    - generic:
      - generic:
        - generic:
          - generic:
            - generic:
              - generic:
                - banner:
                  - list [ref=e7]:
                    - listitem [ref=e8]:
                      - link "Seleccionar país" [ref=e9] [cursor=pointer]:
                        - /url: "#"
                        - generic [ref=e10]: Nuestra presencia
                        - img "flecha desplegable" [ref=e11]
                  - generic [ref=e13]:
                    - link "Ir a la página principal" [ref=e15] [cursor=pointer]:
                      - /url: https://www.grupoficohsa.com
                      - img "Logo Ficohsa" [ref=e16]
                    - generic [ref=e17]:
                      - generic [ref=e18]:
                        - button "Acerca de Ficohsa flecha desplegable" [ref=e19] [cursor=pointer]:
                          - text: Acerca de Ficohsa
                          - img "flecha desplegable" [ref=e20]
                        - button "Sostenibilidad flecha desplegable" [ref=e21] [cursor=pointer]:
                          - text: Sostenibilidad
                          - img "flecha desplegable" [ref=e22]
                        - generic [ref=e23] [cursor=pointer]:
                          - text: Transparencia
                          - img "flecha desplegable" [ref=e24]
                      - img "Abrir búsqueda" [ref=e27] [cursor=pointer]
  - generic [ref=e31]:
    - generic [ref=e35]:
      - text: TE DAMOS LA BIENVENIDA
      - paragraph [ref=e36]: "Juntos hacemos de nuestra comunidad: Sostenible"
      - generic [ref=e37]:
        - link "Conócenos" [ref=e39] [cursor=pointer]:
          - /url: /acerca-de-ficohsa/nosotros
        - link "Prensa Ficohsa" [ref=e41] [cursor=pointer]:
          - /url: /acerca-de-ficohsa/prensa-ficohsa
    - img "Tira" [ref=e46]
  - generic [ref=e49]:
    - generic [ref=e54]:
      - generic [ref=e55]:
        - paragraph [ref=e57]: "+30"
        - paragraph [ref=e58]: años de experiencia en el sector financiero
      - generic [ref=e59]:
        - paragraph [ref=e61]: 2.1M
        - paragraph [ref=e62]: de clientes, con presencia internacional
      - generic [ref=e63]:
        - paragraph [ref=e65]: "+7.000"
        - paragraph [ref=e66]: colaboradores son parte de nuestra familia
      - generic [ref=e67]:
        - paragraph [ref=e69]: "+5.000"
        - paragraph [ref=e70]: puntos de servicio a nivel internacional
    - generic [ref=e79]:
      - heading "Nuestro impacto como empresa" [level=4] [ref=e80]
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e84]:
            - generic [ref=e85]:
              - img "Descripción de la imagen" [ref=e86]
              - generic [ref=e87]: 5 min
            - generic [ref=e89]:
              - generic [ref=e90]: novedades
              - heading "Ficohsa inaugura su primera agencia en Marcala, La Paz" [level=3] [ref=e91]
              - paragraph [ref=e92]:
                - text: Grupo Ficohsa continúa reafirmando su compromiso con el desarrollo sostenible y la inclusión financiera en Honduras con la inauguración...
                - link "Leer más sobre ¿Qué pasa si me bloquean mi cuenta y qué hacer?" [ref=e93] [cursor=pointer]:
                  - /url: /content/corporativo-site/es/inicio/acerca-de-ficohsa/prensa-ficohsa/noticias-grupo-financiero/Ficohsa-inaugura-su-primera-agencia-en-Marcala.html
                  - text: Leer más
          - generic [ref=e95]:
            - generic [ref=e96]:
              - img "Descripción de la imagen" [ref=e97]
              - generic [ref=e98]: 5 min
            - generic [ref=e100]:
              - generic [ref=e101]: lanzamientos
              - heading "Ficohsa lanza programa de préstamos transformador" [level=3] [ref=e102]
              - paragraph [ref=e103]:
                - text: Con el apoyo del Gobierno de los Estados Unidos, DFC y Citi, el nuevo financiamiento potenciará a las empresas, generará empleos y promoverá la e...
                - link "Leer más sobre ¿Qué pasa si me bloquean mi cuenta y qué hacer?" [ref=e104] [cursor=pointer]:
                  - /url: /content/corporativo-site/es/inicio/acerca-de-ficohsa/prensa-ficohsa/ficohsa-lanza-programa-de-prestamos-transformador.html
                  - text: Leer más
          - generic [ref=e106]:
            - generic [ref=e107]:
              - img "Descripción de la imagen" [ref=e108]
              - generic [ref=e109]: 5 min
            - generic [ref=e111]:
              - heading "Ficohsa inaugura nueva agencia en San Marcos Ocotepeque Impulsando el desarrollo local" [level=3] [ref=e114]
              - paragraph [ref=e115]:
                - text: Con esta apertura la institución financiera cuenta con 180 centros de servicios entre agencias, autobancos y ventanillas Ficohsa.
                - link "Leer más sobre ¿Qué pasa si me bloquean mi cuenta y qué hacer?" [ref=e116] [cursor=pointer]:
                  - /url: /content/corporativo-site/es/inicio/acerca-de-ficohsa/prensa-ficohsa/noticias-grupo-financiero/Ficohsa-inaugura-nueva-agencia-en-San-Marcos-Ocotepeque-Impulsando-el-desarrollo-local.html
                  - text: Leer más
        - link "Más noticias" [ref=e118] [cursor=pointer]:
          - /url: /acerca-de-ficohsa/prensa-ficohsa
          - button "Más noticias" [ref=e119]:
            - generic [ref=e120]: Más noticias
    - generic [ref=e125]:
      - generic [ref=e127]:
        - generic [ref=e128]: Responsabilidad social
        - generic [ref=e129]: Programas institucionales
      - generic [ref=e132]:
        - generic [ref=e133]:
          - img "imagen" [ref=e135]
          - generic [ref=e136]:
            - heading "Fundación Ficohsa" [level=3] [ref=e137]
            - paragraph [ref=e138]: Estamos comprometidos a ofrecer oportunidades educativas y construir un futuro mejor para todos.
            - link "Conocer más Icono flecha" [ref=e139] [cursor=pointer]:
              - /url: /sostenibilidad/fundacion-ficohsa
              - text: Conocer más
              - img "Icono flecha" [ref=e140]
        - generic [ref=e141]:
          - img "imagen" [ref=e143]
          - generic [ref=e144]:
            - heading "Mujeres Adelante" [level=3] [ref=e145]
            - paragraph [ref=e146]: La nueva experiencia financiera con productos, servicios, asistencias y beneficios pensados para ti.
            - link "Conocer más Icono flecha" [ref=e147] [cursor=pointer]:
              - /url: /sostenibilidad/mujeres-adelante
              - text: Conocer más
              - img "Icono flecha" [ref=e148]
        - generic [ref=e149]:
          - img "imagen" [ref=e151]
          - generic [ref=e152]:
            - heading "Tu Conciencia Financiera" [level=3] [ref=e153]
            - paragraph [ref=e154]: La plataforma que te ayudará en una adecuada administración de tus finanzas personales
            - link "Conocer más Icono flecha" [ref=e155] [cursor=pointer]:
              - /url: /sostenibilidad/tu-conciencia-financiera
              - text: Conocer más
              - img "Icono flecha" [ref=e156]
        - generic [ref=e157]:
          - img "imagen" [ref=e159]
          - generic [ref=e160]:
            - heading "De Mi Tierra" [level=3] [ref=e161]
            - paragraph [ref=e162]: Impulsamos el desarrollo económico y social de comunidades vulnerables financiando a productores agrícolas locales.
            - link "Conocer más Icono flecha" [ref=e163] [cursor=pointer]:
              - /url: /sostenibilidad/de-mi-tierra
              - text: Conocer más
              - img "Icono flecha" [ref=e164]
    - generic [ref=e178]:
      - img "Newsletter" [ref=e180]
      - generic [ref=e181]:
        - text: NOTICIAS PARA TI
        - heading "Únete a nuestro boletín informativo" [level=2] [ref=e182]
        - paragraph [ref=e183]: Suscríbete para estar enterado de las últimas noticias y eventos.
        - generic [ref=e184]:
          - textbox "Ingresa tu nombre" [ref=e187]:
            - /placeholder: Nombre
          - textbox "Ingresa tu correo electrónico" [ref=e190]:
            - /placeholder: Correo electrónico
          - textbox "Ingresa tu empresa o asociación" [ref=e193]:
            - /placeholder: Empresa o asociación
          - button "Suscribirme" [disabled] [ref=e195]
  - generic [ref=e204]:
    - generic [ref=e209] [cursor=pointer]: Honduras
    - generic [ref=e213]:
      - link "Política de privacidad|" [ref=e214] [cursor=pointer]:
        - /url: /politica-de-privacidad
      - link "Ética | Integridad" [ref=e215] [cursor=pointer]:
        - /url: https://eticaficohsa.com/?_ga=2.158988666.1133873783.1747083353-0195aa07-4
    - text: "|"
    - generic [ref=e216]: © 2025 Ficohsa | Todos los derechos reservados. Banco Financiera Comercial Hondureña, S.A
```

# Test source

```ts
  74  |     const start = Date.now();
  75  |     let status: 'passed' | 'failed' = 'passed';
  76  |     let errorMsg: string | undefined;
  77  |     let screenshot: string | undefined;
  78  | 
  79  |     try {
  80  |       const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  81  |       const html = await page.content();
  82  | 
  83  |       expect(response?.status()).toBe(200);
  84  |       expect(html.toLowerCase()).toContain('<!doctype html');
  85  |       expect(html.length).toBeGreaterThan(1000);
  86  | 
  87  |       const title = await page.title();
  88  |       expect(title.length).toBeGreaterThan(0);
  89  |       expect(title.toLowerCase()).toMatch(/ficohsa|grupo/i);
  90  | 
  91  |       await dismissOverlays(page);
  92  |       screenshot = await captureScreenshot(page, testId);
  93  |     } catch (err) {
  94  |       status = 'failed';
  95  |       errorMsg = err instanceof Error ? err.message : String(err);
  96  |       throw err;
  97  |     } finally {
  98  |       recordEvidence({
  99  |         id: testId,
  100 |         titulo: 'Documento SSR con HTML válido y título',
  101 |         criterio: 'CA-RN01-01',
  102 |         regla: 'RN-01',
  103 |         status,
  104 |         duracionMs: Date.now() - start,
  105 |         screenshot,
  106 |         detalles: { tituloPagina: await page.title().catch(() => '') },
  107 |         error: errorMsg,
  108 |       });
  109 |     }
  110 |   });
  111 | 
  112 |   test('TC-ARQ-001-03: Contenido principal visible sin pantalla en blanco (RN-01 / HU visitante)', async ({
  113 |     page,
  114 |   }) => {
  115 |     const testId = 'TC-ARQ-001-03';
  116 |     const start = Date.now();
  117 |     let status: 'passed' | 'failed' = 'passed';
  118 |     let errorMsg: string | undefined;
  119 |     let screenshot: string | undefined;
  120 | 
  121 |     try {
  122 |       await page.goto('/', { waitUntil: 'domcontentloaded' });
  123 |       await waitForMainContent(page);
  124 |       await dismissOverlays(page);
  125 | 
  126 |       const bodyText = await page.locator('body').innerText();
  127 |       expect(bodyText.trim().length).toBeGreaterThan(100);
  128 | 
  129 |       const visibleElements = await page.locator('body *:visible').count();
  130 |       expect(visibleElements).toBeGreaterThan(10);
  131 | 
  132 |       screenshot = await captureScreenshot(page, testId);
  133 |     } catch (err) {
  134 |       status = 'failed';
  135 |       errorMsg = err instanceof Error ? err.message : String(err);
  136 |       throw err;
  137 |     } finally {
  138 |       recordEvidence({
  139 |         id: testId,
  140 |         titulo: 'Contenido principal visible sin pantalla en blanco',
  141 |         criterio: 'HU visitante — experiencia fluida',
  142 |         regla: 'RN-01',
  143 |         status,
  144 |         duracionMs: Date.now() - start,
  145 |         screenshot,
  146 |         detalles: {},
  147 |         error: errorMsg,
  148 |       });
  149 |     }
  150 |   });
  151 | 
  152 |   test('TC-ARQ-001-04: Sin errores críticos de consola en carga inicial (CA-RN02-01 / RN-02)', async ({
  153 |     page,
  154 |   }) => {
  155 |     const testId = 'TC-ARQ-001-04';
  156 |     const start = Date.now();
  157 |     let status: 'passed' | 'failed' = 'passed';
  158 |     let errorMsg: string | undefined;
  159 |     let screenshot: string | undefined;
  160 |     const consoleErrors = getConsoleErrors(page);
  161 | 
  162 |     try {
  163 |       await page.goto('/', { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
  164 |         await page.goto('/', { waitUntil: 'domcontentloaded' });
  165 |       });
  166 |       await waitForMainContent(page);
  167 |       await dismissOverlays(page);
  168 |       await page.waitForTimeout(2000);
  169 | 
  170 |       const critical = filterCriticalConsoleErrors(consoleErrors);
  171 |       expect(
  172 |         critical,
  173 |         `Errores críticos de consola detectados: ${critical.join(' | ')}`,
> 174 |       ).toHaveLength(0);
      |         ^ Error: Errores críticos de consola detectados: The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy. | Cannot read properties of null (reading 'getAttribute') | Cannot read properties of undefined (reading 'addEventListener')
  175 | 
  176 |       screenshot = await captureScreenshot(page, testId);
  177 |     } catch (err) {
  178 |       status = 'failed';
  179 |       errorMsg = err instanceof Error ? err.message : String(err);
  180 |       throw err;
  181 |     } finally {
  182 |       recordEvidence({
  183 |         id: testId,
  184 |         titulo: 'Sin errores críticos de consola en carga inicial',
  185 |         criterio: 'CA-RN02-01',
  186 |         regla: 'RN-02',
  187 |         status,
  188 |         duracionMs: Date.now() - start,
  189 |         screenshot,
  190 |         detalles: {
  191 |           erroresConsola: filterCriticalConsoleErrors(consoleErrors),
  192 |           totalErroresRaw: consoleErrors.length,
  193 |         },
  194 |         error: errorMsg,
  195 |       });
  196 |     }
  197 |   });
  198 | 
  199 |   test('TC-ARQ-001-05: Recursos de integración cargan sin fallos HTTP ≥ 400 (CA-RN02-01 / RN-02)', async ({
  200 |     page,
  201 |   }) => {
  202 |     const testId = 'TC-ARQ-001-05';
  203 |     const start = Date.now();
  204 |     let status: 'passed' | 'failed' = 'passed';
  205 |     let errorMsg: string | undefined;
  206 |     let screenshot: string | undefined;
  207 |     const responses: import('@playwright/test').Response[] = [];
  208 | 
  209 |     page.on('response', (r) => responses.push(r));
  210 | 
  211 |     try {
  212 |       await page.goto('/', { waitUntil: 'networkidle', timeout: 45_000 }).catch(async () => {
  213 |         await page.goto('/', { waitUntil: 'domcontentloaded' });
  214 |       });
  215 |       await waitForMainContent(page);
  216 |       await dismissOverlays(page);
  217 | 
  218 |       const failed = collectFailedResponses(responses);
  219 |       const failedSummary = failed.map((r) => `${r.status()} ${r.url()}`);
  220 | 
  221 |       expect(
  222 |         failed.length,
  223 |         `Recursos con fallo HTTP: ${failedSummary.join('; ')}`,
  224 |       ).toBe(0);
  225 | 
  226 |       screenshot = await captureScreenshot(page, testId);
  227 |     } catch (err) {
  228 |       status = 'failed';
  229 |       errorMsg = err instanceof Error ? err.message : String(err);
  230 |       throw err;
  231 |     } finally {
  232 |       const failed = collectFailedResponses(responses);
  233 |       recordEvidence({
  234 |         id: testId,
  235 |         titulo: 'Recursos de integración sin fallos HTTP críticos',
  236 |         criterio: 'CA-RN02-01',
  237 |         regla: 'RN-02',
  238 |         status,
  239 |         duracionMs: Date.now() - start,
  240 |         screenshot,
  241 |         detalles: {
  242 |           totalRespuestas: responses.length,
  243 |           fallosHttp: failed.map((r) => ({ status: r.status(), url: r.url() })),
  244 |         },
  245 |         error: errorMsg,
  246 |       });
  247 |     }
  248 |   });
  249 | 
  250 |   test('TC-ARQ-001-06: Navegación interna fluida entre secciones SSR (RN-02 / HU visitante)', async ({
  251 |     page,
  252 |   }) => {
  253 |     const testId = 'TC-ARQ-001-06';
  254 |     const start = Date.now();
  255 |     let status: 'passed' | 'failed' = 'passed';
  256 |     let errorMsg: string | undefined;
  257 |     let screenshot: string | undefined;
  258 |     const navResults: { enlace: string; status: number | null; ok: boolean }[] = [];
  259 | 
  260 |     try {
  261 |       await page.goto('/', { waitUntil: 'domcontentloaded' });
  262 |       await waitForMainContent(page);
  263 |       await dismissOverlays(page);
  264 | 
  265 |       const navLinks = page.locator(
  266 |         '[role="banner"] a[href], a[href^="/"]:not([href^="#"]), a[href*="grupoficohsa.com"]',
  267 |       );
  268 |       const count = await navLinks.count();
  269 |       expect(count).toBeGreaterThan(0);
  270 | 
  271 |       const linksToTest = Math.min(count, 3);
  272 |       for (let i = 0; i < linksToTest; i++) {
  273 |         await page.goto('/', { waitUntil: 'domcontentloaded' });
  274 |         await dismissOverlays(page);
```