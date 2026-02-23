# Casos de prueba funcionales — Uso con Selenium

Los archivos `casos_prueba_funcionales_cocinastore.csv` y `casos_prueba_funcionales_cocinastore.xlsx` están preparados para rellenar el formulario **Crear Caso de Prueba** y para automatización con Selenium.

## Columnas del formulario (y del CSV/Excel)

| Campo | Uso |
|-------|-----|
| **Titulo** | Nombre del caso de prueba. |
| **URL Destino** | URL base del portal (ej. `http://localhost:5174`). |
| **Prioridad** | Alta, Media o Baja. |
| **Categoria** | Autenticacion, Catalogo, Carrito, Checkout, Mi cuenta, Navegacion. |
| **Descripcion** | Qué se valida en el caso. |
| **Precondiciones** | Qué debe cumplirse antes de ejecutar (ej. usuario logueado, carrito con productos). |
| **Test Step** | Número de paso (1, 2, 3…). |
| **Accion** | Tipo de acción Selenium (ver tabla siguiente). |
| **Valor** | Parámetro de la acción: URL, selector CSS/XPath, o `selector|texto` en Escribir texto. |
| **Descripcion del paso** | Explicación del paso para quien ejecuta o revisa. |
| **Resultado Esperado** | Un único resultado verificable por paso. |

## Acciones (Accion) y uso en Selenium

| Accion | Valor | Ejemplo Selenium (idea) |
|--------|--------|---------------------------|
| **Navegar a URL** | URL completa | `driver.get(valor)` |
| **Click en elemento** | Selector CSS o XPath (si empieza por `//`) | `driver.findElement(By.css(valor)).click()` o `By.xpath(valor)` |
| **Escribir texto** | `selector|texto` (selector y texto separados por `\|`) | Localizar por selector, luego `sendKeys(texto)` |
| **Verificar texto** | Texto que debe aparecer en la página | Assert que el texto está presente en el DOM o en un elemento. |
| **Verificar URL** | Parte de la URL (ej. `/login`, `/carrito`) | `assert driver.getCurrentUrl().contains(valor)` |
| **Verificar elemento visible** | Selector CSS o XPath | `driver.findElement(By.css(valor)).isDisplayed()` |

## Selectores

- **CSS**: se usan selectores con `[class*='nombreClase']` para que sigan funcionando con clases con hash de CSS modules (React).
- **XPath**: si **Valor** empieza por `//`, tratar como XPath (ej. `//button[contains(text(),'Volver')]`).
- **Escribir texto**: en **Valor** va `selector|texto`. Ejemplo: `input[type='email']|demo@cocina.com` → localizar el input y hacer `sendKeys("demo@cocina.com")`.

## URL base

Por defecto los casos usan `http://localhost:5174`. Cambiar **URL Destino** en el CSV/Excel (o en el formulario) si el portal corre en otro host o puerto.

## Regenerar el Excel desde el CSV

```bash
node scripts/generar-casos-prueba-xlsx.js
```

El CSV es la fuente principal; el XLSX se genera a partir de él.
