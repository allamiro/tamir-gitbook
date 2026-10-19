# Components

## Callouts

GitHub-style alerts:

> [!NOTE]
> Notes use the info style.

Text between two alerts.

> [!TIP]
> Tips can hold `inline code` and **bold** text.

> [!WARNING]
> Kramed merges these two quotes into one.

> [!CAUTION]
> Each marker still gets its own callout.

> [!IMPORTANT]
>
> The marker can stand alone.
>
> Two paragraphs follow it.

And a quote:

> A plain blockquote stays a plain quote.

GitBook hints:

{% hint style="success", title="Saved" %}
Hint **body** with a [link](README.md).
{% endhint %}

{% hint style="danger" %}
An untitled danger hint.
{% endhint %}

## Tabs

{% tabs %}
{% tab title="Linux" %}
```bash
sudo apt-get install -y docker.io
```
{% tab title="macOS" %}
```bash
brew install --cask docker
```
{% tab title="Windows" %}
> [!NOTE]
> Docker Desktop needs WSL 2.

```console
PS> winget install -e --id Docker.DockerDesktop
```
{% endtabs %}

The same titles again, so the groups stay in sync:

{% tabs %}
{% tab title="Linux" %}
Linux text.
{% tab title="macOS" %}
macOS text.
{% tab title="Windows" %}
Windows text.
{% endtabs %}

## Steps

{% stepper %}
{% step %}
### Install Docker

Pick your operating system above.
{% step %}
### Start the wiki

```console
$ docker compose up -d
```
{% step %}
### Check it

Open the site in a browser.
{% endstepper %}

## Checklist

- [ ] The container is healthy
- [x] The wiki opens
- [ ] Saving a page reloads it
- [ ] The build output exists

## Details

<details>
<summary>Advanced options</summary>

<p>Hidden until opened.</p>

</details>

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to stop. Keep {% path %}book.json{% endpath %}
next to {% path %}SUMMARY.md{% endpath %}; the site is built into {% path %}_book/{% endpath %}.
