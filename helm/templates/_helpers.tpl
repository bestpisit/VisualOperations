{{- define "visops.fullname" -}}
{{- if .Values.nameOverride }}
{{ .Values.nameOverride | trim }}
{{- else }}
{{ .Release.Name | trim }}
{{- end }}
{{- end }}