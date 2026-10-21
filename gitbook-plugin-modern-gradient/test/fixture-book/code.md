# Code blocks

A JSON file with a title, line numbers and highlighted lines:

{% code title="book.json" lineNumbers="true" highlight="3-4" %}
```json
{
  "title": "Modern Gradient Fixture",
  "plugins": ["modern-gradient"],
  "pluginsConfig": {
    "modern-gradient": { "variant": "premium-developer" }
  }
}
```
{% endcode %}

A long line to wrap:

```js
/* A comment that
   spans two lines */
var message = "a long line of JavaScript that keeps going well past the edge of the content column so that wrapping matters";
```

A block without a language:

```
plain text & <tags>
```

Starting the stack:

```console
$ docker compose up -d
[+] Running 2/2
 ✔ Container wiki  Started
$ docker images --filter dangling=true
REPOSITORY   TAG       IMAGE ID
<none>       <none>    0f3c2a1b
```

On Windows:

```terminal
PS> winget install -e --id Docker.DockerDesktop
PS C:\> docker --version
Docker version 27.3.1
```

Commands only:

```shell-session
$ echo "{% raw %}{{ x }}{% endraw %}" &amp; done
```

Template syntax shown literally:

```jinja
{% raw %}{{ page.title }}{% endraw %}
{%- if x -%}{{ x }}{% endif %}
{% endraw %} and {% raw %} on their own
```

The end.
